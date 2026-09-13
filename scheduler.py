from datetime import datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler

from database import SessionLocal
from models import (
    User,
    Medication,
    MedicationLog,
    ReminderEvent
)

from notification_service import send_reminder_email


scheduler = BackgroundScheduler()

reminded_medications = set()


# ============================================================
# CHECK MEDICATION REMINDERS
# ============================================================

def check_medication_reminders():

    db = SessionLocal()

    try:

        now = datetime.now()

        current_time = now.strftime("%H:%M")
        current_date = now.strftime("%Y-%m-%d")

        # ====================================================
        # 1. CHECK ACTIVE MEDICATIONS
        # ====================================================

        medications = db.query(Medication).filter(
            Medication.active == True
        ).all()

        for medication in medications:

            reminder_time = medication.reminder_time.strip()

            if reminder_time != current_time:
                continue

            reminder_key = (
                f"{current_date}-"
                f"{medication.id}-"
                f"{current_time}"
            )

            # Prevent duplicate processing
            if reminder_key in reminded_medications:
                continue

            scheduled_time = now.replace(
                second=0,
                microsecond=0
            )

            # =================================================
            # CHECK DATABASE FOR EXISTING EVENT
            # =================================================

            existing_event = db.query(
                ReminderEvent
            ).filter(
                ReminderEvent.medication_id == medication.id,
                ReminderEvent.user_id == medication.user_id,
                ReminderEvent.scheduled_at == scheduled_time
            ).first()

            if existing_event:

                reminded_medications.add(
                    reminder_key
                )

                continue

            # =================================================
            # CREATE PENDING REMINDER EVENT
            # =================================================

            reminder_event = ReminderEvent(
                user_id=medication.user_id,
                medication_id=medication.id,
                scheduled_at=scheduled_time,
                status="PENDING"
            )

            db.add(reminder_event)

            db.commit()

            db.refresh(reminder_event)

            reminded_medications.add(
                reminder_key
            )

            # =================================================
            # PRINT REMINDER
            # =================================================

            print()
            print("=" * 60)
            print("💊 MEDICATION REMINDER")
            print("=" * 60)

            print(
                f"User ID       : {medication.user_id}"
            )

            print(
                f"Medicine      : {medication.medicine_name}"
            )

            print(
                f"Dosage        : {medication.dosage}"
            )

            print(
                f"Reminder Time : {medication.reminder_time}"
            )

            print(
                f"Frequency     : {medication.frequency}"
            )

            print(
                "Status        : PENDING"
            )

            print("=" * 60)
            print()

            # =================================================
            # SEND EMAIL NOTIFICATION
            # =================================================

            user = db.query(User).filter(
                User.id == medication.user_id
            ).first()

            if user:

                send_reminder_email(
                    recipient_email=user.email,
                    medicine_name=medication.medicine_name,
                    dosage=medication.dosage,
                    reminder_time=medication.reminder_time,
                    frequency=medication.frequency
                )

        # ====================================================
        # 2. CHECK FOR MISSED REMINDERS
        # ====================================================

        missed_before = now - timedelta(
            minutes=5
        )

        pending_events = db.query(
            ReminderEvent
        ).filter(
            ReminderEvent.status == "PENDING",
            ReminderEvent.scheduled_at <= missed_before
        ).all()

        for event in pending_events:

            # =================================================
            # CHANGE PENDING → MISSED
            # =================================================

            event.status = "MISSED"

            # =================================================
            # CHECK EXISTING LOG
            # =================================================

            existing_log = db.query(
                MedicationLog
            ).filter(
                MedicationLog.user_id == event.user_id,
                MedicationLog.medication_id == event.medication_id,
                MedicationLog.scheduled_at == event.scheduled_at
            ).first()

            # =================================================
            # CREATE MISSED LOG
            # =================================================

            if existing_log is None:

                missed_log = MedicationLog(
                    user_id=event.user_id,
                    medication_id=event.medication_id,
                    taken=False,
                    scheduled_at=event.scheduled_at,
                    taken_at=None
                )

                db.add(missed_log)

            # =================================================
            # GET MEDICATION DETAILS
            # =================================================

            medication = db.query(
                Medication
            ).filter(
                Medication.id == event.medication_id
            ).first()

            print()
            print("=" * 60)
            print("⚠️ MISSED MEDICATION")
            print("=" * 60)

            print(
                f"User ID       : {event.user_id}"
            )

            print(
                f"Medication ID : {event.medication_id}"
            )

            if medication:

                print(
                    f"Medicine      : {medication.medicine_name}"
                )

                print(
                    f"Dosage        : {medication.dosage}"
                )

            print(
                f"Scheduled At  : {event.scheduled_at}"
            )

            print(
                "Status        : MISSED"
            )

            print("=" * 60)
            print()

        # ====================================================
        # SAVE ALL CHANGES
        # ====================================================

        db.commit()

    except Exception as e:

        db.rollback()

        print(
            f"Scheduler error: {e}"
        )

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
            replace_existing=True
        )

        scheduler.start()

        print(
            "Medication reminder scheduler started."
        )


# ============================================================
# STOP SCHEDULER
# ============================================================

def stop_scheduler():

    if scheduler.running:

        scheduler.shutdown(
            wait=False
        )

        print(
            "Medication reminder scheduler stopped."
        )



        