"""End-to-end API tests on an isolated temporary SQLite database.

Run:  pytest -q  (from repo root, SECRET_KEY is set below automatically)
"""

import os
import tempfile
from datetime import datetime, timedelta, timezone

# ---- Isolated test DB + secret BEFORE any app import ----
_tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp.close()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp.name}"
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-pytest-only")
# Same TestClient IP for every request -> keep the limit high here;
# rate limiting itself is covered by test_rate_limit below.
os.environ["RATE_LIMIT_MAX"] = "10000"

import pytest
from fastapi.testclient import TestClient

import database
import main
import scheduler
from models import ReminderEvent, MedicationLog

client = TestClient(main.app, raise_server_exceptions=False)

_uid = 0


def unique_email(prefix="user"):
    global _uid
    _uid += 1
    return f"{prefix}{_uid}_{os.getpid()}@example.com"


def register(username="testuser", email=None, password="password123"):
    email = email or unique_email()
    r = client.post(
        "/register",
        json={"username": username, "email": email, "password": password},
    )
    assert r.status_code == 200, r.text
    return {
        "username": username,
        "email": email,
        "password": password,
        "user_id": r.json()["user_id"],
    }


def login(email, password):
    r = client.post("/login", data={"username": email, "password": password})
    assert r.status_code == 200, r.text
    body = r.json()
    assert "access_token" in body and "refresh_token" in body
    return body


def auth(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def user():
    u = register()
    tok = login(u["email"], u["password"])
    u["token"] = tok["access_token"]
    u["refresh_token"] = tok["refresh_token"]
    u["headers"] = auth(tok["access_token"])
    return u


def add_med(headers, **over):
    payload = {
        "medicine_name": "Paracetamol",
        "dosage": "500 mg",
        "reminder_time": "08:30",
        "frequency": "Daily",
    }
    payload.update(over)
    r = client.post("/add-medication", json=payload, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


# ---------- auth ----------


def test_register_and_duplicate():
    u = register(username="alice")
    assert u["user_id"] > 0
    r = client.post(
        "/register",
        json={"username": "alice2", "email": u["email"], "password": "password123"},
    )
    assert r.status_code == 409


def test_register_validation():
    r = client.post(
        "/register",
        json={"username": "x", "email": "not-an-email", "password": "password123"},
    )
    assert r.status_code == 422
    r = client.post(
        "/register", json={"username": "x", "email": unique_email(), "password": "123"}
    )
    assert r.status_code == 422


def test_login_success_and_failure(user):
    tok = login(user["email"], user["password"])
    assert tok["token_type"] == "bearer"
    r = client.post("/login", data={"username": user["email"], "password": "wrongpass"})
    assert r.status_code == 401
    r = client.post(
        "/login", data={"username": "nobody@example.com", "password": "x" * 8}
    )
    assert r.status_code == 401


def test_protected_without_token():
    assert client.get("/medications").status_code == 401
    assert client.get("/stats").status_code == 401
    assert client.get("/reminders").status_code == 401


def test_password_never_returned(user):
    r = client.get("/profile", headers=user["headers"])
    assert r.status_code == 200
    assert "password" not in r.json()


def test_refresh_and_logout(user):
    r = client.post("/refresh", json={"refresh_token": user["refresh_token"]})
    assert r.status_code == 200, r.text
    new_access = r.json()["access_token"]
    # old refresh token was rotated -> reuse fails
    r = client.post("/refresh", json={"refresh_token": user["refresh_token"]})
    assert r.status_code == 401
    # logout revokes the new session
    r = client.post("/logout", json={}, headers=auth(new_access))
    assert r.status_code == 200


# ---------- user isolation ----------


def test_user_isolation():
    a = register(username="isoA")
    b = register(username="isoB")
    ta = login(a["email"], a["password"])["access_token"]
    tb = login(b["email"], b["password"])["access_token"]
    med = add_med(auth(ta), medicine_name="PrivateMed")
    # B sees nothing of A
    r = client.get("/medications", headers=auth(tb))
    assert r.status_code == 200
    assert all(m["id"] != med["id"] for m in r.json())
    assert client.get(f"/medications/{med['id']}", headers=auth(tb)).status_code == 403
    assert (
        client.put(
            f"/medications/{med['id']}",
            headers=auth(tb),
            json={
                "medicine_name": "Hijack",
                "dosage": "1mg",
                "reminder_time": "09:00",
                "frequency": "Daily",
            },
        ).status_code
        == 403
    )
    assert (
        client.delete(f"/medications/{med['id']}", headers=auth(tb)).status_code == 403
    )
    # cross-user nested routes blocked too
    assert (
        client.get(f"/users/{a['user_id']}/medications", headers=auth(tb)).status_code
        == 403
    )


# ---------- medication CRUD ----------


def test_medication_crud(user):
    h = user["headers"]
    med = add_med(
        h,
        medicine_name="Aspirin",
        dose_times=["20:00"],
        weekdays=[0, 2, 4],
        stock_remaining=10,
        stock_threshold=3,
        doses_per_intake=1,
    )
    assert med["dose_times"] == ["20:00"]
    assert med["weekdays"] == [0, 2, 4]
    mid = med["id"]

    r = client.get("/medications", headers=h)
    assert r.status_code == 200 and any(m["id"] == mid for m in r.json())

    r = client.get(f"/medications/{mid}", headers=h)
    assert r.status_code == 200 and r.json()["medicine_name"] == "Aspirin"

    r = client.put(
        f"/medications/{mid}",
        headers=h,
        json={
            "medicine_name": "Aspirin",
            "dosage": "100 mg",
            "reminder_time": "09:00",
            "frequency": "Daily",
        },
    )
    assert r.status_code == 200 and r.json()["dosage"] == "100 mg"

    r = client.patch(f"/medications/{mid}/status?active=false", headers=h)
    assert r.status_code == 200 and r.json()["active"] is False
    r = client.patch(f"/medications/{mid}/status", headers=h, json={"active": True})
    assert r.status_code == 200 and r.json()["active"] is True

    r = client.post(f"/medications/{mid}/refill", headers=h, json={"amount": 5})
    assert r.status_code == 200 and r.json()["stock_remaining"] == 15

    r = client.delete(f"/medications/{mid}", headers=h)
    assert r.status_code == 200
    assert client.get(f"/medications/{mid}", headers=h).status_code == 404


def test_medication_validation(user):
    h = user["headers"]
    bad = {
        "medicine_name": "X",
        "dosage": "1mg",
        "reminder_time": "25:99",
        "frequency": "Daily",
    }
    assert client.post("/add-medication", json=bad, headers=h).status_code == 422
    bad["reminder_time"] = "08:00"
    bad["weekdays"] = [7]
    assert client.post("/add-medication", json=bad, headers=h).status_code == 422
    med = add_med(h)
    assert (
        client.post(
            f"/medications/{med['id']}/refill", headers=h, json={"amount": 0}
        ).status_code
        == 422
    )


# ---------- logs + stats ----------


def test_taken_missed_and_stats(user):
    h = user["headers"]
    med = add_med(h)
    mid = med["id"]

    r = client.post(f"/medications/{mid}/taken", headers=h)
    assert r.status_code == 200 and r.json()["taken"] is True

    # legacy alias
    r = client.post(f"/mark-taken/{mid}", headers=h)
    assert r.status_code == 200 and r.json()["taken"] is True

    r = client.post(f"/medications/{mid}/missed", headers=h)
    assert r.status_code == 200 and r.json()["taken"] is False

    r = client.get("/stats", headers=h)
    assert r.status_code == 200
    stats = r.json()
    assert stats["taken_logs"] == 2
    assert stats["missed_logs"] == 1
    assert stats["adherence_percentage"] == pytest.approx(66.67, abs=0.01)

    r = client.get("/analytics/trend?days=7", headers=h)
    assert r.status_code == 200 and len(r.json()["trend"]) == 7

    r = client.get("/logs/export", headers=h)
    assert r.status_code == 200 and "Paracetamol" in r.text


def test_mark_taken_unknown_medication(user):
    assert (
        client.post("/medications/999999/taken", headers=user["headers"]).status_code
        == 404
    )


# ---------- reminder settings ----------


def test_reminder_settings(user):
    h = user["headers"]
    r = client.get("/settings/reminders", headers=h)
    assert r.status_code == 200
    assert r.json()["timezone"] == "UTC"
    assert "channels" in r.json()

    r = client.put(
        "/settings/reminders",
        headers=h,
        json={"timezone": "Asia/Kolkata", "telegram_chat_id": "12345"},
    )
    assert r.status_code == 200
    assert r.json()["timezone"] == "Asia/Kolkata"

    r = client.put("/settings/reminders", headers=h, json={"timezone": "Mars/Olympus"})
    assert r.status_code == 422


# ---------- notifications ----------


def test_low_stock_notification_flow(user):
    h = user["headers"]
    med = add_med(h, medicine_name="StockMed", stock_remaining=1, stock_threshold=5)
    client.post(f"/medications/{med['id']}/taken", headers=h)

    r = client.get("/notifications", headers=h)
    assert r.status_code == 200
    notifs = r.json()
    assert any(n["type"] == "LOW_STOCK" for n in notifs)

    r = client.get("/notifications/unread-count", headers=h)
    assert r.json()["unread"] >= 1

    nid = notifs[0]["id"]
    r = client.patch(f"/notifications/{nid}/read", headers=h)
    assert r.status_code == 200
    r = client.post("/notifications/read-all", headers=h)
    assert r.status_code == 200
    r = client.get("/notifications/unread-count", headers=h)
    assert r.json()["unread"] == 0


# ---------- profile + password ----------


def test_profile_update_and_password_change(user):
    h = user["headers"]
    new_email = unique_email("newaddr")
    r = client.put(
        "/profile",
        headers=h,
        json={
            "username": "renamed",
            "email": new_email,
            "timezone": "America/New_York",
        },
    )
    assert r.status_code == 200
    assert r.json()["timezone"] == "America/New_York"

    r = client.put(
        "/profile/password",
        headers=h,
        json={"current_password": user["password"], "new_password": "brand-new-pass-1"},
    )
    assert r.status_code == 200
    # old password dead, new one works
    assert (
        client.post(
            "/login", data={"username": new_email, "password": user["password"]}
        ).status_code
        == 401
    )
    assert (
        client.post(
            "/login", data={"username": new_email, "password": "brand-new-pass-1"}
        ).status_code
        == 200
    )


def test_password_reset_flow(user):
    r = client.post("/password-reset/request", json={"email": user["email"]})
    assert r.status_code == 200
    # unknown email returns the same message (no enumeration)
    r = client.post("/password-reset/request", json={"email": unique_email("ghost")})
    assert r.status_code == 200

    # mint a reset token directly (raw value is emailed in production)
    from security import generate_refresh_token
    from models import PasswordResetToken

    raw, digest = generate_refresh_token()
    db = database.SessionLocal()
    try:
        db.add(
            PasswordResetToken(
                user_id=user["user_id"],
                token_hash=digest,
                expires_at=datetime.now(timezone.utc).replace(tzinfo=None)
                + timedelta(minutes=30),
                used=False,
            )
        )
        db.commit()
    finally:
        db.close()

    r = client.post(
        "/password-reset/confirm", json={"token": raw, "new_password": "reset-pass-99"}
    )
    assert r.status_code == 200, r.text
    # token is single-use
    r = client.post(
        "/password-reset/confirm", json={"token": raw, "new_password": "reset-pass-99"}
    )
    assert r.status_code == 400


# ---------- nested user routes ----------


def test_nested_user_routes(user):
    h = user["headers"]
    uid = user["user_id"]
    r = client.post(
        f"/users/{uid}/medications",
        headers=h,
        json={
            "medicine_name": "NestedMed",
            "dosage": "10 mg",
            "reminder_time": "07:00",
            "frequency": "Daily",
        },
    )
    assert r.status_code == 201
    mid = r.json()["id"]

    r = client.get(f"/users/{uid}/medications", headers=h)
    assert any(m["id"] == mid for m in r.json())
    client.post(f"/medications/{mid}/taken", headers=h)
    r = client.get(f"/users/{uid}/logs", headers=h)
    assert r.status_code == 200 and len(r.json()) >= 1
    r = client.get(f"/users/{uid}/reminders", headers=h)
    assert r.status_code == 200
    r = client.get("/logs", headers=h)
    assert r.status_code == 200 and len(r.json()) >= 1
    r = client.get("/reminders", headers=h)
    assert r.status_code == 200


def test_ai_adherence_no_data(user):
    med = add_med(user["headers"], medicine_name="FreshMed")
    r = client.get(f"/ai/medications/{med['id']}/adherence", headers=user["headers"])
    assert r.status_code == 200
    assert r.json()["status"] == "NO DATA"


# ---------- health ----------


def test_rate_limit(monkeypatch):
    monkeypatch.setattr(main, "_RATE_LIMIT_MAX", 2)
    main._rate_hits.clear()
    try:
        for i in range(2):
            r = client.post(
                "/register",
                json={
                    "username": f"rl{i}",
                    "email": unique_email("rl"),
                    "password": "password123",
                },
            )
            assert r.status_code == 200, r.text
        r = client.post(
            "/register",
            json={
                "username": "rl-blocked",
                "email": unique_email("rl"),
                "password": "password123",
            },
        )
        assert r.status_code == 429
    finally:
        main._rate_hits.clear()


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] in ("ok", "degraded")


# ---------- scheduler ----------


def test_scheduler_creates_reminder_and_notification(user, monkeypatch):
    sent = []
    monkeypatch.setattr(
        scheduler, "send_reminder_email", lambda **kw: sent.append(kw) or True
    )
    monkeypatch.setattr(scheduler, "send_telegram_message", lambda *a, **k: False)

    # Scheduler matches dose times in the user's timezone (default UTC),
    # and all timestamps are stored as naive UTC.
    now_hm = datetime.now(timezone.utc).strftime("%H:%M")
    med = add_med(user["headers"], medicine_name="SchedMed", reminder_time=now_hm)

    scheduler.check_medication_reminders()

    db = database.SessionLocal()
    try:
        events = (
            db.query(ReminderEvent)
            .filter(ReminderEvent.medication_id == med["id"])
            .all()
        )
        assert len(events) >= 1
        assert events[-1].status == "PENDING"
    finally:
        db.close()
    assert sent, "reminder email sender should have been called"

    # second run is idempotent: no duplicate event for same minute
    scheduler.check_medication_reminders()
    db = database.SessionLocal()
    try:
        count = (
            db.query(ReminderEvent)
            .filter(ReminderEvent.medication_id == med["id"])
            .count()
        )
        assert count == len(events)
    finally:
        db.close()


def test_scheduler_marks_missed(user):
    h = user["headers"]
    med = add_med(h, medicine_name="MissedMed", reminder_time="00:01")
    db = database.SessionLocal()
    try:
        old = ReminderEvent(
            user_id=user["user_id"],
            medication_id=med["id"],
            scheduled_at=datetime.now(timezone.utc).replace(tzinfo=None)
            - timedelta(minutes=10),
            status="PENDING",
        )
        db.add(old)
        db.commit()
        event_id = old.id
    finally:
        db.close()

    scheduler.check_medication_reminders()

    db = database.SessionLocal()
    try:
        ev = db.query(ReminderEvent).filter(ReminderEvent.id == event_id).first()
        assert ev.status == "MISSED"
        log = (
            db.query(MedicationLog)
            .filter(
                MedicationLog.medication_id == med["id"], MedicationLog.taken == False
            )
            .first()
        )  # noqa: E712
        assert log is not None
    finally:
        db.close()


def test_scheduler_helpers():
    class Fake:
        reminder_time = "08:00"
        dose_times = '["20:00", "08:00"]'
        weekdays = "0,2,4"
        stock_remaining = 2
        stock_threshold = 5

    assert scheduler.get_dose_times(Fake()) == ["08:00", "20:00"]
    assert scheduler.get_weekdays(Fake()) == {0, 2, 4}
    assert scheduler.is_low_stock(Fake()) is True
    assert scheduler.dose_times_to_storage(["20:00", "08:00"]) == '["08:00", "20:00"]'
    assert scheduler.weekdays_to_storage([4, 0]) == "0,4"


# ---------- AI fallback ----------


def test_ai_fallback_no_keys(user, monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    h = user["headers"]

    r = client.post(
        "/ai/medication-advice?medicine_name=Ibuprofen&dosage=200mg&symptom=headache",
        headers=h,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True and body["source"] == "local"
    assert "safety" in body

    r = client.post(
        "/ai/interactions",
        headers=h,
        json={"medications": [{"name": "Warfarin"}, {"name": "Aspirin"}]},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["highest_severity"] == "HIGH"
    assert "disclaimer" in body

    r = client.post("/ai/chat", headers=h, json={"message": "How is my adherence?"})
    assert r.status_code == 200
    assert "disclaimer" in r.json()

    med = add_med(h)
    client.post(f"/medications/{med['id']}/taken", headers=h)
    r = client.get(f"/ai/medications/{med['id']}/adherence", headers=h)
    assert r.status_code == 200
    assert r.json()["adherence_percentage"] == 100.0
    r = client.get(f"/ai/medications/{med['id']}/recommendation", headers=h)
    assert r.status_code == 200
    assert r.json()["action"] == "NORMAL_REMINDER"
