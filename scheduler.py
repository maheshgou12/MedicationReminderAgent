from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
import json

from apscheduler.schedulers.background import BackgroundScheduler

from database import SessionLocal
from models import User, Medication, MedicationLog, ReminderEvent

from notification_service import (
    send_reminder_email,
    send_telegram_message,
    create_notification,
)

# NOTE: single-worker design. Run exactly ONE web/worker process so the
# every-30s job does not double-fire (documented in README). The
# ReminderEvent existence check + in-memory `reminded_medications` set
# make repeats idempotent, but two workers would still send duplicate
# emails. Use one Render/Railway web service instance.


def user_now(user) -> datetime:
    """Current time in the user's timezone (naive local wall-clock).

    Dose schedules (reminder_time / dose_times) are wall-clock times in
    the user's own timezone. Falls back to UTC on bad/missing values.
    """

    tz_name = (getattr(user, "timezone", None) or "UTC").strip() or "UTC"

    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        tz = timezone.utc

    return datetime.now(tz).replace(tzinfo=None)


# ============================================================
# SCHEDULE HELPERS (also used by main.py)
# ============================================================


def get_dose_times(medication) -> list:
    """All daily dose times: legacy reminder_time + extra dose_times."""

    times = []

    base = (medication.reminder_time or "").strip()

    if base:
        times.append(base)

    if medication.dose_times:
        try:
            extra = json.loads(medication.dose_times)

            if isinstance(extra, list):
                for t in extra:
                    if isinstance(t, str):
                        t = t.strip()

                        if t and t not in times:
                            times.append(t)
        except (json.JSONDecodeError, ValueError, TypeError):
            pass

    return sorted(times)


def get_weekdays(medication):
    """Set of weekday ints (0=Mon..6=Sun), or None for every day."""

    if not medication.weekdays:
        return None

    try:
        days = {
            int(x) for x in str(medication.weekdays).split(",") if x.strip().isdigit()
        }

        return days or None
    except (ValueError, TypeError):
        return None


def is_due_today(medication, dt: datetime) -> bool:
    weekdays = get_weekdays(medication)

    if weekdays is None:
        return True

    return dt.weekday() in weekdays


def is_low_stock(medication) -> bool:
    if medication.stock_remaining is None:
        return False

    if medication.stock_threshold is None:
        return False

    return medication.stock_remaining <= medication.stock_threshold


def dose_times_to_storage(times) -> str | None:
    if not times:
        return None

    return json.dumps(sorted(set(times)))


def weekdays_to_storage(days) -> str | None:
    if not days:
        return None

    return ",".join(str(d) for d in sorted(set(days)))


scheduler = BackgroundScheduler()

reminded_medications = set()


# ============================================================
# CHECK MEDICATION REMINDERS
# ============================================================


def check_medication_reminders():
    db = SessionLocal()

    try:
        now = datetime.now(timezone.utc).replace(tzinfo=None)

        medications = (
            db.query(Medication)
            .filter(
                Medication.active == True  # noqa: E712
            )
            .all()
        )

        # Cache users so each row costs no extra query.
        users = {u.id: u for u in db.query(User).all()}

        for medication in medications:
            user = users.get(medication.user_id)

            # Per-user wall clock for dose matching.
            local = user_now(user) if user is not None else now

            current_time = local.strftime("%H:%M")
            current_date = local.strftime("%Y-%m-%d")

            # Weekday-restricted schedules skip other days
            if not is_due_today(medication, local):
                continue

            dose_times = get_dose_times(medication)

            if current_time not in dose_times:
                continue

            reminder_key = f"{current_date}-{medication.id}-{current_time}"

            # Prevent duplicate processing
            if reminder_key in reminded_medications:
                continue

            scheduled_time = now.replace(second=0, microsecond=0)

            # =================================================
            # CHECK DATABASE FOR EXISTING EVENT
            # =================================================

            existing_event = (
                db.query(ReminderEvent)
                .filter(
                    ReminderEvent.medication_id == medication.id,
                    ReminderEvent.user_id == medication.user_id,
                    ReminderEvent.scheduled_at == scheduled_time,
                )
                .first()
            )

            if existing_event:
                reminded_medications.add(reminder_key)

                continue

            # =================================================
            # CREATE PENDING REMINDER EVENT
            # =================================================

            reminder_event = ReminderEvent(
                user_id=medication.user_id,
                medication_id=medication.id,
                scheduled_at=scheduled_time,
                status="PENDING",
            )

            db.add(reminder_event)

            db.commit()

            db.refresh(reminder_event)

            reminded_medications.add(reminder_key)

            # =================================================
            # PRINT REMINDER
            # =================================================

            print()
            print("=" * 60)
            print("💊 MEDICATION REMINDER")
            print("=" * 60)

            print(f"User ID       : {medication.user_id}")

            print(f"Medicine      : {medication.medicine_name}")

            print(f"Dosage        : {medication.dosage}")

            print(f"Reminder Time : {medication.reminder_time}")

            print(f"Frequency     : {medication.frequency}")

            print("Status        : PENDING")

            print("=" * 60)
            print()

            # =================================================
            # SEND EMAIL NOTIFICATION
            # =================================================

            user = db.query(User).filter(User.id == medication.user_id).first()

            if user:
                send_reminder_email(
                    recipient_email=user.email,
                    medicine_name=medication.medicine_name,
                    dosage=medication.dosage,
                    reminder_time=medication.reminder_time,
                    frequency=medication.frequency,
                )

                send_telegram_message(
                    f"Time for {medication.medicine_name} "
                    f"({medication.dosage}) at {medication.reminder_time}",
                    chat_id=getattr(user, "telegram_chat_id", None),
                )

            # =================================================
            # IN-APP NOTIFICATION
            # =================================================

            create_notification(
                db,
                user_id=medication.user_id,
                type="REMINDER",
                title=f"Time for {medication.medicine_name}",
                message=(f"Take {medication.dosage} ({medication.frequency})."),
                medication_id=medication.id,
            )

        # ====================================================
        # 2. CHECK FOR MISSED REMINDERS
        # ====================================================

        missed_before = now - timedelta(minutes=5)

        pending_events = (
            db.query(ReminderEvent)
            .filter(
                ReminderEvent.status == "PENDING",
                ReminderEvent.scheduled_at <= missed_before,
            )
            .all()
        )

        for event in pending_events:
            # =================================================
            # CHANGE PENDING → MISSED
            # =================================================

            event.status = "MISSED"

            # =================================================
            # CHECK EXISTING LOG
            # =================================================

            existing_log = (
                db.query(MedicationLog)
                .filter(
                    MedicationLog.user_id == event.user_id,
                    MedicationLog.medication_id == event.medication_id,
                    MedicationLog.scheduled_at == event.scheduled_at,
                )
                .first()
            )

            # =================================================
            # CREATE MISSED LOG
            # =================================================

            if existing_log is None:
                missed_log = MedicationLog(
                    user_id=event.user_id,
                    medication_id=event.medication_id,
                    taken=False,
                    scheduled_at=event.scheduled_at,
                    taken_at=None,
                )

                db.add(missed_log)

            # =================================================
            # GET MEDICATION DETAILS
            # =================================================

            medication = (
                db.query(Medication)
                .filter(Medication.id == event.medication_id)
                .first()
            )

            print()
            print("=" * 60)
            print("⚠️ MISSED MEDICATION")
            print("=" * 60)

            print(f"User ID       : {event.user_id}")

            print(f"Medication ID : {event.medication_id}")

            if medication:
                print(f"Medicine      : {medication.medicine_name}")

                print(f"Dosage        : {medication.dosage}")

            print(f"Scheduled At  : {event.scheduled_at}")

            print("Status        : MISSED")

            print("=" * 60)
            print()

            # =================================================
            # IN-APP NOTIFICATION + ESCALATION
            # =================================================

            med_name = (
                medication.medicine_name
                if medication
                else f"Medication #{event.medication_id}"
            )

            create_notification(
                db,
                user_id=event.user_id,
                type="MISSED",
                title=f"Missed: {med_name}",
                message=(
                    f"Scheduled at {event.scheduled_at}. "
                    "Mark it taken if you took it late."
                ),
                medication_id=event.medication_id,
            )

            # Escalate after 3+ missed doses in the last 7 days
            week_ago = now - timedelta(days=7)

            recent_missed = (
                db.query(MedicationLog)
                .filter(
                    MedicationLog.user_id == event.user_id,
                    MedicationLog.medication_id == event.medication_id,
                    MedicationLog.taken == False,  # noqa: E712
                    MedicationLog.scheduled_at >= week_ago,
                )
                .count()
            )

            if recent_missed >= 3:
                create_notification(
                    db,
                    user_id=event.user_id,
                    type="ESCALATION",
                    title=f"Attention needed: {med_name}",
                    message=(
                        f"{recent_missed} missed doses in the last 7 days. "
                        "Consider discussing with your doctor or pharmacist."
                    ),
                    medication_id=event.medication_id,
                )

        # ====================================================
        # SAVE ALL CHANGES
        # ====================================================

        db.commit()

    except Exception as e:
        db.rollback()

        print(f"Scheduler error: {e}")

    finally:
        db.close()


# ============================================================
# START SCHEDULER
# ============================================================


def start_scheduler():
    if not scheduler.running:
        scheduler.add_job(
            check_medication_reminders,
            "interval",
            seconds=30,
            id="medication_reminder_job",
            replace_existing=True,
        )

        scheduler.start()

        print("Medication reminder scheduler started.")


# ============================================================
# STOP SCHEDULER
# ============================================================


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)

        print("Medication reminder scheduler stopped.")
