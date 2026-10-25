from datetime import datetime, timedelta, timezone
from contextlib import asynccontextmanager
import logging
import os
import time

from fastapi import FastAPI, HTTPException, Depends, Body, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import csv
import io

from database import SessionLocal
from models import (
    User,
    Medication,
    MedicationLog,
    ReminderEvent,
    Notification,
    RefreshToken,
    PasswordResetToken,
)
from schemas import (
    UserCreate,
    UserResponse,
    MedicationCreate,
    MedicationResponse,
    NotificationResponse,
    PasswordUpdate,
    ProfileUpdate,
    ReminderSettingsUpdate,
    PasswordResetRequest,
    PasswordResetConfirm,
    InteractionRequest,
    ChatRequest,
)

from security import (
    hash_password,
    verify_password,
    create_access_token,
    generate_refresh_token,
    hash_token,
    refresh_token_expiry,
    get_current_user_id,
)

from scheduler import (
    start_scheduler,
    stop_scheduler,
    dose_times_to_storage,
    weekdays_to_storage,
    is_low_stock,
)

from notification_service import create_notification

from ai_service import (
    generate_medication_advice,
    generate_adherence_analysis,
    check_drug_interactions,
    chat_with_assistant,
)


# ============================================================
# DATABASE INITIALIZATION
# ============================================================

# Non-destructive startup migrations (creates tables + adds new
# columns without touching existing data)
try:
    from migrate import run_migrations as _run_migrations

    _run_migrations()
except Exception as e:
    print(f"Migration warning: {e}")


# ============================================================
# FASTAPI LIFESPAN
# ============================================================


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()

    yield

    stop_scheduler()


# ============================================================
# LOGGING
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("medication-reminder")


# ============================================================
# SIMPLE IN-MEMORY RATE LIMITER (login/register)
# ============================================================

_RATE_LIMIT_MAX = int(os.getenv("RATE_LIMIT_MAX", "30"))
_RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
_rate_hits: dict = {}


def _rate_limit(key: str):
    now = time.time()
    hits = [t for t in _rate_hits.get(key, []) if now - t < _RATE_LIMIT_WINDOW]
    if len(hits) >= _RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=429,
            detail="Too many attempts. Please try again shortly.",
        )
    hits.append(now)
    _rate_hits[key] = hits


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="Medication Reminder Agent",
    description="Medication management, reminders, adherence tracking and AI insights",
    version="1.0.0",
    lifespan=lifespan,
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    elapsed_ms = (time.time() - start) * 1000
    logger.info(
        "%s %s -> %s (%.1fms)",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
    )
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# ============================================================
# CORS (configurable via ALLOWED_ORIGINS env var)
# ============================================================

_allowed_origins = [
    o.strip()
    for o in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:5174,http://127.0.0.1:5174,"
        "http://localhost:5175,http://127.0.0.1:5175,"
        "http://localhost:3000,http://127.0.0.1:3000,"
        "https://medication-reminder-agent-ochre.vercel.app",
    ).split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# HOME + HEALTH
# ============================================================


@app.get("/")
def home():
    return {"message": "Medication Reminder Agent Running", "status": "active"}


@app.get("/health", tags=["System"])
def health():
    from database import engine
    from sqlalchemy import text

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "up"
    except Exception as e:
        logger.warning("Health DB check failed: %s", e)
        db_status = "down"

    status = "ok" if db_status == "up" else "degraded"

    return {
        "status": status,
        "database": db_status,
        "time_utc": datetime.utcnow().isoformat() + "Z",
    }


# ============================================================
# USER CRUD
# ============================================================


@app.post("/users", response_model=UserResponse, status_code=201, tags=["Users"])
def create_user(user_data: UserCreate):
    db: Session = SessionLocal()

    try:
        existing_user = db.query(User).filter(User.email == user_data.email).first()

        if existing_user:
            raise HTTPException(status_code=409, detail="Email already registered")

        user = User(
            username=user_data.username,
            email=user_data.email,
            password=hash_password(user_data.password),
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        return user

    finally:
        db.close()


@app.get("/users", response_model=list[UserResponse], tags=["Users"])
def get_users():
    db: Session = SessionLocal()

    try:
        return db.query(User).order_by(User.id).all()

    finally:
        db.close()


@app.get("/users/{user_id}", response_model=UserResponse, tags=["Users"])
def get_user(user_id: int):
    db: Session = SessionLocal()

    try:
        user = db.query(User).filter(User.id == user_id).first()

        if user is None:
            raise HTTPException(status_code=404, detail="User not found")

        return user

    finally:
        db.close()


@app.put("/users/{user_id}", response_model=UserResponse, tags=["Users"])
def update_user(user_id: int, user_data: UserCreate):
    db: Session = SessionLocal()

    try:
        user = db.query(User).filter(User.id == user_id).first()

        if user is None:
            raise HTTPException(status_code=404, detail="User not found")

        duplicate_email = (
            db.query(User)
            .filter(User.email == user_data.email, User.id != user_id)
            .first()
        )

        if duplicate_email:
            raise HTTPException(status_code=409, detail="Email already registered")

        user.username = user_data.username
        user.email = user_data.email
        user.password = hash_password(user_data.password)

        db.commit()
        db.refresh(user)

        return user

    finally:
        db.close()


@app.delete("/users/{user_id}", tags=["Users"])
def delete_user(user_id: int):
    db: Session = SessionLocal()

    try:
        user = db.query(User).filter(User.id == user_id).first()

        if user is None:
            raise HTTPException(status_code=404, detail="User not found")

        db.delete(user)
        db.commit()

        return {"message": "User deleted successfully", "user_id": user_id}

    finally:
        db.close()


# ============================================================
# REGISTER
# ============================================================


@app.post("/register", tags=["Authentication"])
def register(request: Request, user_data: UserCreate):
    _rate_limit(f"register:{_client_ip(request)}")

    db: Session = SessionLocal()

    try:
        existing_user = db.query(User).filter(User.email == user_data.email).first()

        if existing_user:
            raise HTTPException(status_code=409, detail="Email already registered")

        user = User(
            username=user_data.username,
            email=user_data.email,
            password=hash_password(user_data.password),
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        try:
            from notification_service import send_welcome_email

            send_welcome_email(user.email, user.username)
        except Exception:
            pass

        return {"message": "User Registered Successfully", "user_id": user.id}

    finally:
        db.close()


# ============================================================
# LOGIN
# ============================================================


@app.post("/login", tags=["Authentication"])
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):
    _rate_limit(f"login:{_client_ip(request)}")

    db: Session = SessionLocal()

    try:
        # OAuth2 username field contains email
        email = form_data.username
        password = form_data.password

        user = db.query(User).filter(User.email == email).first()

        if user is None:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        if not verify_password(password, user.password):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        access_token = create_access_token(user.id)

        raw_refresh, digest = generate_refresh_token()

        db.add(
            RefreshToken(
                user_id=user.id,
                token_hash=digest,
                expires_at=refresh_token_expiry(),
                revoked=False,
            )
        )
        db.commit()

        return {
            "access_token": access_token,
            "refresh_token": raw_refresh,
            "token_type": "bearer",
            "user_id": user.id,
            "username": user.username,
            "email": user.email,
        }

    finally:
        db.close()


# ============================================================
# REFRESH + LOGOUT (Authentication)
# ============================================================


@app.post("/refresh", tags=["Authentication"])
def refresh_session(body: dict = Body(...)):
    raw = (body.get("refresh_token") or "").strip()

    if not raw:
        raise HTTPException(status_code=401, detail="Missing refresh token")

    db: Session = SessionLocal()

    try:
        stored = (
            db.query(RefreshToken)
            .filter(
                RefreshToken.token_hash == hash_token(raw),
                RefreshToken.revoked == False,  # noqa: E712
            )
            .first()
        )

        if stored is None:
            raise HTTPException(status_code=401, detail="Invalid refresh token")

        if stored.expires_at < datetime.utcnow():
            raise HTTPException(status_code=401, detail="Refresh token expired")

        # Rotate: revoke old, issue new pair
        stored.revoked = True

        raw_new, digest_new = generate_refresh_token()

        db.add(
            RefreshToken(
                user_id=stored.user_id,
                token_hash=digest_new,
                expires_at=refresh_token_expiry(),
                revoked=False,
            )
        )
        db.commit()

        return {
            "access_token": create_access_token(stored.user_id),
            "refresh_token": raw_new,
            "token_type": "bearer",
        }

    finally:
        db.close()


@app.post("/logout", tags=["Authentication"])
def logout(
    body: dict = Body(default=None),
    current_user_id: int = Depends(get_current_user_id),
):
    db: Session = SessionLocal()

    try:
        query = db.query(RefreshToken).filter(
            RefreshToken.user_id == current_user_id,
            RefreshToken.revoked == False,  # noqa: E712
        )

        # Revoke one session if a refresh token is given, else all
        raw = (body or {}).get("refresh_token")

        if raw:
            query = query.filter(RefreshToken.token_hash == hash_token(raw.strip()))

        count = query.update({"revoked": True})
        db.commit()

        return {"message": "Logged out", "sessions_revoked": count}

    finally:
        db.close()


# ============================================================
# PASSWORD RESET (Authentication)
# ============================================================


@app.post("/password-reset/request", tags=["Authentication"])
def password_reset_request(data: PasswordResetRequest):
    from notification_service import send_password_reset_email

    db: Session = SessionLocal()

    try:
        user = db.query(User).filter(User.email == data.email).first()

        # Always return success to avoid email enumeration
        if user is None:
            return {
                "message": "A reset link has been sent to your email if the account exists."
            }

        raw, digest = generate_refresh_token()

        db.add(
            PasswordResetToken(
                user_id=user.id,
                token_hash=digest,
                expires_at=datetime.utcnow() + timedelta(minutes=30),
                used=False,
            )
        )
        db.commit()

        send_password_reset_email(user.email, raw)

        return {
            "message": "A reset link has been sent to your email if the account exists."
        }

    finally:
        db.close()


@app.get("/auth/reset-password", include_in_schema=False)
def auth_reset_password_redirect(token: str = Query(...)):
    from notification_service import get_frontend_url
    from fastapi.responses import RedirectResponse

    frontend_url = get_frontend_url()
    return RedirectResponse(url=f"{frontend_url}/reset-password?token={token}")


@app.post("/password-reset/confirm", tags=["Authentication"])
def password_reset_confirm(data: PasswordResetConfirm):
    db: Session = SessionLocal()

    try:
        stored = (
            db.query(PasswordResetToken)
            .filter(
                PasswordResetToken.token_hash == hash_token(data.token.strip()),
                PasswordResetToken.used == False,  # noqa: E712
            )
            .first()
        )

        if stored is None:
            raise HTTPException(status_code=400, detail="Invalid reset token")

        if stored.expires_at < datetime.utcnow():
            raise HTTPException(status_code=400, detail="Reset token expired")

        user = db.query(User).filter(User.id == stored.user_id).first()

        if user is None:
            raise HTTPException(status_code=404, detail="User not found")

        user.password = hash_password(data.new_password)
        stored.used = True

        # Revoke all sessions on password change
        db.query(RefreshToken).filter(RefreshToken.user_id == user.id).update(
            {"revoked": True}
        )

        db.commit()

        return {"message": "Password reset successfully"}

    finally:
        db.close()


# ============================================================
# PROFILE (Authentication)
# ============================================================


@app.get("/profile", response_model=UserResponse, tags=["Authentication"])
def get_profile(current_user_id: int = Depends(get_current_user_id)):
    db: Session = SessionLocal()

    try:
        user = db.query(User).filter(User.id == current_user_id).first()

        if user is None:
            raise HTTPException(status_code=404, detail="User not found")

        return user

    finally:
        db.close()


@app.put("/profile", response_model=UserResponse, tags=["Authentication"])
def update_profile(
    data: ProfileUpdate,
    current_user_id: int = Depends(get_current_user_id),
):
    db: Session = SessionLocal()

    try:
        user = db.query(User).filter(User.id == current_user_id).first()

        if user is None:
            raise HTTPException(status_code=404, detail="User not found")

        duplicate = (
            db.query(User)
            .filter(
                User.email == data.email,
                User.id != current_user_id,
            )
            .first()
        )

        if duplicate:
            raise HTTPException(status_code=409, detail="Email already registered")

        user.username = data.username
        user.email = data.email

        if data.timezone is not None:
            user.timezone = data.timezone

        if data.telegram_chat_id is not None:
            user.telegram_chat_id = data.telegram_chat_id or None

        db.commit()
        db.refresh(user)

        return user

    finally:
        db.close()


# ============================================================
# REMINDER SETTINGS (timezone + notification channel)
# ============================================================


@app.get("/settings/reminders", tags=["Settings"])
def get_reminder_settings(
    current_user_id: int = Depends(get_current_user_id),
):
    db: Session = SessionLocal()

    try:
        user = db.query(User).filter(User.id == current_user_id).first()

        if user is None:
            raise HTTPException(status_code=404, detail="User not found")

        from notification_service import (
            SMTP_HOST as _smtp_host,
            TELEGRAM_BOT_TOKEN as _tg_token,
            WEBHOOK_URL as _webhook,
        )

        return {
            "timezone": user.timezone or "UTC",
            "telegram_chat_id": user.telegram_chat_id,
            "channels": {
                "email": bool(_smtp_host),
                "telegram": bool(_tg_token),
                "webhook": bool(_webhook),
                "in_app": True,
            },
        }

    finally:
        db.close()


@app.put("/settings/reminders", tags=["Settings"])
def update_reminder_settings(
    data: ReminderSettingsUpdate,
    current_user_id: int = Depends(get_current_user_id),
):
    db: Session = SessionLocal()

    try:
        user = db.query(User).filter(User.id == current_user_id).first()

        if user is None:
            raise HTTPException(status_code=404, detail="User not found")

        if data.timezone is not None:
            user.timezone = data.timezone or "UTC"

        if data.telegram_chat_id is not None:
            user.telegram_chat_id = data.telegram_chat_id or None

        db.commit()
        db.refresh(user)

        return {
            "message": "Reminder settings updated",
            "timezone": user.timezone,
            "telegram_chat_id": user.telegram_chat_id,
        }

    finally:
        db.close()


@app.put("/profile/password", tags=["Authentication"])
def update_password(
    data: PasswordUpdate,
    current_user_id: int = Depends(get_current_user_id),
):
    db: Session = SessionLocal()

    try:
        user = db.query(User).filter(User.id == current_user_id).first()

        if user is None:
            raise HTTPException(status_code=404, detail="User not found")

        if not verify_password(data.current_password, user.password):
            raise HTTPException(status_code=400, detail="Current password is incorrect")

        user.password = hash_password(data.new_password)

        # Revoke all sessions: user logs in again everywhere
        db.query(RefreshToken).filter(RefreshToken.user_id == user.id).update(
            {"revoked": True}
        )

        db.commit()

        return {"message": "Password updated successfully"}

    finally:
        db.close()


# ============================================================
# MEDICATIONS
# ============================================================


@app.post(
    "/users/{user_id}/medications",
    response_model=MedicationResponse,
    status_code=201,
    tags=["Medications"],
)
def add_medication(
    user_id: int,
    medication_data: MedicationCreate,
    current_user_id: int = Depends(get_current_user_id),
):
    if user_id != current_user_id:
        raise HTTPException(
            status_code=403, detail="You cannot access another user's medications"
        )

    db: Session = SessionLocal()

    try:
        user = db.query(User).filter(User.id == user_id).first()

        if user is None:
            raise HTTPException(status_code=404, detail="User not found")

        medication = Medication(
            user_id=user_id,
            medicine_name=medication_data.medicine_name,
            dosage=medication_data.dosage,
            reminder_time=medication_data.reminder_time,
            frequency=medication_data.frequency,
            dose_times=dose_times_to_storage(medication_data.dose_times),
            weekdays=weekdays_to_storage(medication_data.weekdays),
            stock_remaining=medication_data.stock_remaining,
            stock_threshold=medication_data.stock_threshold,
            doses_per_intake=medication_data.doses_per_intake,
            active=True,
        )

        db.add(medication)
        db.commit()
        db.refresh(medication)

        return medication

    finally:
        db.close()


@app.get(
    "/users/{user_id}/medications",
    response_model=list[MedicationResponse],
    tags=["Medications"],
)
def get_user_medications(
    user_id: int, current_user_id: int = Depends(get_current_user_id)
):
    if user_id != current_user_id:
        raise HTTPException(
            status_code=403, detail="You cannot access another user's medications"
        )

    db: Session = SessionLocal()

    try:
        medications = (
            db.query(Medication)
            .filter(Medication.user_id == user_id)
            .order_by(Medication.id)
            .all()
        )

        return medications

    finally:
        db.close()


@app.get("/medications", response_model=list[MedicationResponse], tags=["Medications"])
def get_medications(current_user_id: int = Depends(get_current_user_id)):
    db: Session = SessionLocal()

    try:
        medications = (
            db.query(Medication)
            .filter(Medication.user_id == current_user_id)
            .order_by(Medication.id)
            .all()
        )

        return medications

    finally:
        db.close()


@app.get(
    "/medications/{medication_id}",
    response_model=MedicationResponse,
    tags=["Medications"],
)
def get_medication(
    medication_id: int, current_user_id: int = Depends(get_current_user_id)
):
    db: Session = SessionLocal()

    try:
        medication = db.query(Medication).filter(Medication.id == medication_id).first()

        if medication is None:
            raise HTTPException(status_code=404, detail="Medication not found")

        if medication.user_id != current_user_id:
            raise HTTPException(
                status_code=403, detail="You cannot access this medication"
            )

        return medication

    finally:
        db.close()


@app.put(
    "/medications/{medication_id}",
    response_model=MedicationResponse,
    tags=["Medications"],
)
def update_medication(
    medication_id: int,
    medication_data: MedicationCreate,
    current_user_id: int = Depends(get_current_user_id),
):
    db: Session = SessionLocal()

    try:
        medication = db.query(Medication).filter(Medication.id == medication_id).first()

        if medication is None:
            raise HTTPException(status_code=404, detail="Medication not found")

        if medication.user_id != current_user_id:
            raise HTTPException(
                status_code=403, detail="You cannot modify this medication"
            )

        medication.medicine_name = medication_data.medicine_name

        medication.dosage = medication_data.dosage

        medication.reminder_time = medication_data.reminder_time

        medication.frequency = medication_data.frequency

        medication.dose_times = (
            dose_times_to_storage(medication_data.dose_times)
            if medication_data.dose_times is not None
            else medication.dose_times
        )

        medication.weekdays = (
            weekdays_to_storage(medication_data.weekdays)
            if medication_data.weekdays is not None
            else medication.weekdays
        )

        # Optional fields: None means "not provided" -> keep existing value
        # (full PUT payloads from older clients omit these).
        if medication_data.stock_remaining is not None:
            medication.stock_remaining = medication_data.stock_remaining

        if medication_data.stock_threshold is not None:
            medication.stock_threshold = medication_data.stock_threshold

        medication.doses_per_intake = medication_data.doses_per_intake

        medication.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(medication)

        return medication

    finally:
        db.close()


@app.patch("/medications/{medication_id}/status", tags=["Medications"])
def update_medication_status(
    medication_id: int,
    active: bool | None = Query(default=None),
    body: dict | None = Body(default=None),
    current_user_id: int = Depends(get_current_user_id),
):
    # Accept `active` from query string (?active=true) OR JSON body ({"active": true})
    # Frontend sends one of these; support both for robustness.
    if active is None and body is not None:
        raw = body.get("active")
        if isinstance(raw, bool):
            active = raw
        elif isinstance(raw, str):
            active = raw.lower() in ("true", "1", "yes")

    if active is None:
        raise HTTPException(
            status_code=422,
            detail="Missing 'active' (send ?active=true or JSON body {'active': true})",
        )

    db: Session = SessionLocal()

    try:
        medication = db.query(Medication).filter(Medication.id == medication_id).first()

        if medication is None:
            raise HTTPException(status_code=404, detail="Medication not found")

        if medication.user_id != current_user_id:
            raise HTTPException(
                status_code=403, detail="You cannot modify this medication"
            )

        medication.active = active
        medication.updated_at = datetime.utcnow()

        db.commit()

        return {
            "message": "Medication status updated",
            "medication_id": medication_id,
            "active": active,
        }

    finally:
        db.close()


@app.delete("/medications/{medication_id}", tags=["Medications"])
def delete_medication(
    medication_id: int, current_user_id: int = Depends(get_current_user_id)
):
    db: Session = SessionLocal()

    try:
        medication = db.query(Medication).filter(Medication.id == medication_id).first()

        if medication is None:
            raise HTTPException(status_code=404, detail="Medication not found")

        if medication.user_id != current_user_id:
            raise HTTPException(
                status_code=403, detail="You cannot delete this medication"
            )

        db.query(Notification).filter(
            Notification.medication_id == medication_id
        ).delete(synchronize_session=False)

        db.delete(medication)
        db.commit()

        return {
            "message": "Medication deleted successfully",
            "medication_id": medication_id,
        }

    finally:
        db.close()


@app.post(
    "/add-medication",
    response_model=MedicationResponse,
    status_code=201,
    tags=["Medications"],
    summary="Legacy alias of POST /users/{user_id}/medications",
)
def add_medication_legacy(
    medication_data: MedicationCreate,
    current_user_id: int = Depends(get_current_user_id),
):
    """Backward-compatible alias: adds a medication for the current user."""
    return add_medication(current_user_id, medication_data, current_user_id)


@app.post("/medications/{medication_id}/refill", tags=["Medications"])
def refill_medication(
    medication_id: int,
    body: dict = Body(...),
    current_user_id: int = Depends(get_current_user_id),
):
    try:
        amount = int((body.get("amount") if body else 0) or 0)
    except (ValueError, TypeError):
        amount = 0

    if amount < 1 or amount > 10000:
        raise HTTPException(status_code=422, detail="amount must be 1-10000")

    db: Session = SessionLocal()

    try:
        medication = (
            db.query(Medication)
            .filter(
                Medication.id == medication_id,
                Medication.user_id == current_user_id,
            )
            .first()
        )

        if medication is None:
            raise HTTPException(status_code=404, detail="Medication not found")

        medication.stock_remaining = (medication.stock_remaining or 0) + amount
        medication.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(medication)

        return {
            "message": "Refill added",
            "medication_id": medication_id,
            "stock_remaining": medication.stock_remaining,
            "low_stock": is_low_stock(medication),
        }

    finally:
        db.close()


# ============================================================
# MEDICATION LOGS
# ============================================================


@app.post("/medications/{medication_id}/taken", tags=["Medication Logs"])
def mark_medication_taken(
    medication_id: int, current_user_id: int = Depends(get_current_user_id)
):
    db: Session = SessionLocal()

    try:
        medication = (
            db.query(Medication)
            .filter(
                Medication.id == medication_id, Medication.user_id == current_user_id
            )
            .first()
        )

        if medication is None:
            raise HTTPException(status_code=404, detail="Medication not found")

        # All timestamps stored as naive UTC.
        now = datetime.now(timezone.utc).replace(tzinfo=None)

        reminder_event = (
            db.query(ReminderEvent)
            .filter(
                ReminderEvent.medication_id == medication_id,
                ReminderEvent.user_id == current_user_id,
                ReminderEvent.status == "PENDING",
                ReminderEvent.scheduled_at <= now,
            )
            .order_by(ReminderEvent.scheduled_at.desc())
            .first()
        )

        if reminder_event:
            reminder_event.status = "TAKEN"

        medication_log = MedicationLog(
            user_id=current_user_id,
            medication_id=medication_id,
            taken=True,
            scheduled_at=(reminder_event.scheduled_at if reminder_event else now),
            taken_at=now,
        )

        db.add(medication_log)

        # Decrement stock when tracked
        if medication.stock_remaining is not None:
            per_dose = medication.doses_per_intake or 1

            medication.stock_remaining = max(0, medication.stock_remaining - per_dose)

            if is_low_stock(medication):
                create_notification(
                    db,
                    user_id=current_user_id,
                    type="LOW_STOCK",
                    title=f"Low stock: {medication.medicine_name}",
                    message=(
                        f"Only {medication.stock_remaining} dose(s) left. Refill soon."
                    ),
                    medication_id=medication_id,
                )

        db.commit()
        db.refresh(medication_log)

        return {
            "message": "Medicine marked as taken",
            "log_id": medication_log.id,
            "medication_id": medication_id,
            "taken": True,
            "taken_at": medication_log.taken_at,
            "stock_remaining": medication.stock_remaining,
            "low_stock": is_low_stock(medication),
            "reminder_event_id": (reminder_event.id if reminder_event else None),
            "reminder_status": (reminder_event.status if reminder_event else None),
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as e:
        db.rollback()

        raise HTTPException(status_code=500, detail=str(e))

    finally:
        db.close()


@app.post(
    "/mark-taken/{medication_id}",
    tags=["Medication Logs"],
    summary="Legacy alias of POST /medications/{medication_id}/taken",
)
def mark_taken_legacy(
    medication_id: int,
    current_user_id: int = Depends(get_current_user_id),
):
    """Backward-compatible alias for marking a dose taken."""
    return mark_medication_taken(medication_id, current_user_id)


@app.post("/medications/{medication_id}/missed", tags=["Medication Logs"])
def mark_medication_missed(
    medication_id: int, current_user_id: int = Depends(get_current_user_id)
):
    db: Session = SessionLocal()

    try:
        medication = db.query(Medication).filter(Medication.id == medication_id).first()

        if medication is None:
            raise HTTPException(status_code=404, detail="Medication not found")

        if medication.user_id != current_user_id:
            raise HTTPException(
                status_code=403, detail="You cannot access this medication"
            )

        now = datetime.utcnow()

        log = MedicationLog(
            user_id=current_user_id,
            medication_id=medication_id,
            taken=False,
            scheduled_at=now,
            taken_at=None,
        )

        db.add(log)
        db.commit()
        db.refresh(log)

        return {
            "message": "Medicine marked as missed",
            "log_id": log.id,
            "medication_id": medication_id,
            "taken": False,
        }

    finally:
        db.close()


@app.get("/logs", tags=["Medication Logs"])
def get_logs(current_user_id: int = Depends(get_current_user_id)):
    db: Session = SessionLocal()

    try:
        logs = (
            db.query(MedicationLog)
            .filter(MedicationLog.user_id == current_user_id)
            .order_by(MedicationLog.id.desc())
            .all()
        )

        result = []

        for log in logs:
            result.append(
                {
                    "id": log.id,
                    "user_id": log.user_id,
                    "medication_id": log.medication_id,
                    "taken": log.taken,
                    "scheduled_at": log.scheduled_at,
                    "taken_at": log.taken_at,
                    "created_at": log.created_at,
                }
            )

        return result

    finally:
        db.close()


@app.get("/users/{user_id}/logs", tags=["Medication Logs"])
def get_user_logs(user_id: int, current_user_id: int = Depends(get_current_user_id)):
    if user_id != current_user_id:
        raise HTTPException(
            status_code=403, detail="You cannot access another user's logs"
        )

    db: Session = SessionLocal()

    try:
        logs = (
            db.query(MedicationLog)
            .filter(MedicationLog.user_id == user_id)
            .order_by(MedicationLog.id.desc())
            .all()
        )

        result = []

        for log in logs:
            result.append(
                {
                    "id": log.id,
                    "medication_id": log.medication_id,
                    "taken": log.taken,
                    "scheduled_at": log.scheduled_at,
                    "taken_at": log.taken_at,
                    "created_at": log.created_at,
                }
            )

        return result

    finally:
        db.close()


# ============================================================
# REMINDERS
# ============================================================


@app.get("/reminders", tags=["Reminders"])
def get_reminders(current_user_id: int = Depends(get_current_user_id)):
    db: Session = SessionLocal()

    try:
        reminders = (
            db.query(ReminderEvent)
            .filter(ReminderEvent.user_id == current_user_id)
            .order_by(ReminderEvent.scheduled_at.desc())
            .all()
        )

        return reminders

    finally:
        db.close()


@app.get("/users/{user_id}/reminders", tags=["Reminders"])
def get_user_reminders(
    user_id: int, current_user_id: int = Depends(get_current_user_id)
):
    if user_id != current_user_id:
        raise HTTPException(
            status_code=403, detail="Not authorized to access these reminders"
        )

    db: Session = SessionLocal()

    try:
        reminders = (
            db.query(ReminderEvent)
            .filter(ReminderEvent.user_id == user_id)
            .order_by(ReminderEvent.scheduled_at.desc())
            .all()
        )

        return reminders

    finally:
        db.close()


# ============================================================
# NOTIFICATIONS
# ============================================================


@app.get(
    "/notifications", response_model=list[NotificationResponse], tags=["Notifications"]
)
def get_notifications(
    unread_only: bool = False,
    limit: int = Query(default=50, ge=1, le=200),
    current_user_id: int = Depends(get_current_user_id),
):
    db: Session = SessionLocal()

    try:
        query = db.query(Notification).filter(Notification.user_id == current_user_id)

        if unread_only:
            query = query.filter(Notification.read == False)  # noqa: E712

        return query.order_by(Notification.id.desc()).limit(limit).all()

    finally:
        db.close()


@app.get("/notifications/unread-count", tags=["Notifications"])
def unread_count(
    current_user_id: int = Depends(get_current_user_id),
):
    db: Session = SessionLocal()

    try:
        count = (
            db.query(Notification)
            .filter(
                Notification.user_id == current_user_id,
                Notification.read == False,  # noqa: E712
            )
            .count()
        )

        return {"unread": count}

    finally:
        db.close()


@app.patch("/notifications/{notification_id}/read", tags=["Notifications"])
def mark_notification_read(
    notification_id: int,
    current_user_id: int = Depends(get_current_user_id),
):
    db: Session = SessionLocal()

    try:
        notification = (
            db.query(Notification)
            .filter(
                Notification.id == notification_id,
                Notification.user_id == current_user_id,
            )
            .first()
        )

        if notification is None:
            raise HTTPException(status_code=404, detail="Notification not found")

        notification.read = True
        db.commit()

        return {"message": "Marked as read", "id": notification_id}

    finally:
        db.close()


@app.post("/notifications/read-all", tags=["Notifications"])
def mark_all_notifications_read(
    current_user_id: int = Depends(get_current_user_id),
):
    db: Session = SessionLocal()

    try:
        count = (
            db.query(Notification)
            .filter(
                Notification.user_id == current_user_id,
                Notification.read == False,  # noqa: E712
            )
            .update({"read": True})
        )

        db.commit()

        return {"message": "All marked as read", "count": count}

    finally:
        db.close()


# ============================================================
# AI MEDICATION ADVICE
# ============================================================


@app.post("/ai/medication-advice", tags=["AI Agent"])
def medication_advice(
    medicine_name: str,
    dosage: str,
    symptom: str,
    current_user_id: int = Depends(get_current_user_id),
):
    return generate_medication_advice(
        medicine_name=medicine_name, dosage=dosage, symptom=symptom
    )


# ============================================================
# AI ADHERENCE ANALYSIS
# ============================================================


@app.get("/ai/medications/{medication_id}/adherence", tags=["AI Agent"])
def analyze_medication_adherence(
    medication_id: int, current_user_id: int = Depends(get_current_user_id)
):
    db: Session = SessionLocal()

    try:
        medication = (
            db.query(Medication)
            .filter(
                Medication.id == medication_id, Medication.user_id == current_user_id
            )
            .first()
        )

        if medication is None:
            raise HTTPException(status_code=404, detail="Medication not found")

        logs = (
            db.query(MedicationLog)
            .filter(
                MedicationLog.medication_id == medication_id,
                MedicationLog.user_id == current_user_id,
            )
            .order_by(MedicationLog.scheduled_at.desc())
            .all()
        )

        return generate_adherence_analysis(medication=medication, logs=logs)

    finally:
        db.close()


# ============================================================
# AI RECOMMENDATION
# ============================================================


@app.get("/ai/medications/{medication_id}/recommendation", tags=["AI Agent"])
def medication_recommendation(
    medication_id: int, current_user_id: int = Depends(get_current_user_id)
):
    db: Session = SessionLocal()

    try:
        medication = (
            db.query(Medication)
            .filter(
                Medication.id == medication_id, Medication.user_id == current_user_id
            )
            .first()
        )

        if medication is None:
            raise HTTPException(status_code=404, detail="Medication not found")

        logs = (
            db.query(MedicationLog)
            .filter(
                MedicationLog.medication_id == medication_id,
                MedicationLog.user_id == current_user_id,
            )
            .all()
        )

        total_logs = len(logs)

        taken_count = sum(1 for log in logs if log.taken)

        missed_count = sum(1 for log in logs if not log.taken)

        if total_logs > 0:
            adherence_percentage = round((taken_count / total_logs) * 100, 2)
        else:
            adherence_percentage = 0

        if adherence_percentage >= 90:
            action = "NORMAL_REMINDER"
            priority = "LOW"

            message = "Excellent adherence. Continue the normal reminder schedule."

        elif adherence_percentage >= 75:
            action = "NORMAL_REMINDER"
            priority = "MEDIUM"

            message = "Some doses were missed. Continue normal reminders."

        elif adherence_percentage >= 50:
            action = "STRONGER_REMINDER"
            priority = "HIGH"

            message = "Several doses were missed. Stronger reminders may help."

        else:
            action = "ATTENTION_REQUIRED"
            priority = "CRITICAL"

            message = (
                "Medication adherence is very low. "
                "Consider discussing missed doses "
                "with a doctor or pharmacist."
            )

        return {
            "medication_id": medication.id,
            "medicine_name": medication.medicine_name,
            "dosage": medication.dosage,
            "frequency": medication.frequency,
            "total_doses": total_logs,
            "taken_doses": taken_count,
            "missed_doses": missed_count,
            "adherence_percentage": adherence_percentage,
            "action": action,
            "priority": priority,
            "message": message,
        }

    finally:
        db.close()


# ============================================================
# AI INTERACTION CHECK + CHAT
# ============================================================


@app.post("/ai/interactions", tags=["AI Agent"])
def ai_interactions(
    data: InteractionRequest,
    current_user_id: int = Depends(get_current_user_id),
):
    meds = [{"name": m.name, "dosage": m.dosage or ""} for m in data.medications]

    return check_drug_interactions(meds)


@app.post("/ai/chat", tags=["AI Agent"])
def ai_chat(
    data: ChatRequest,
    current_user_id: int = Depends(get_current_user_id),
):
    db: Session = SessionLocal()

    try:
        medications = (
            db.query(Medication).filter(Medication.user_id == current_user_id).all()
        )

        taken = (
            db.query(MedicationLog)
            .filter(
                MedicationLog.user_id == current_user_id,
                MedicationLog.taken == True,  # noqa: E712
            )
            .count()
        )

        missed = (
            db.query(MedicationLog)
            .filter(
                MedicationLog.user_id == current_user_id,
                MedicationLog.taken == False,  # noqa: E712
            )
            .count()
        )

        return chat_with_assistant(
            message=data.message,
            medications=medications,
            taken_count=taken,
            missed_count=missed,
        )

    finally:
        db.close()


# ============================================================
# ANALYTICS / STATS
# ============================================================


@app.get("/stats", tags=["Analytics"])
def stats(current_user_id: int = Depends(get_current_user_id)):
    db: Session = SessionLocal()

    try:
        total_users = db.query(User).count()

        total_medications = (
            db.query(Medication).filter(Medication.user_id == current_user_id).count()
        )

        active_medications = (
            db.query(Medication)
            .filter(Medication.user_id == current_user_id, Medication.active == True)
            .count()
        )

        total_logs = (
            db.query(MedicationLog)
            .filter(MedicationLog.user_id == current_user_id)
            .count()
        )

        taken_logs = (
            db.query(MedicationLog)
            .filter(
                MedicationLog.user_id == current_user_id, MedicationLog.taken == True
            )
            .count()
        )

        missed_logs = (
            db.query(MedicationLog)
            .filter(
                MedicationLog.user_id == current_user_id, MedicationLog.taken == False
            )
            .count()
        )

        adherence_percentage = 0

        if total_logs > 0:
            adherence_percentage = round((taken_logs / total_logs) * 100, 2)

        return {
            "total_users": total_users,
            "total_medications": total_medications,
            "active_medications": active_medications,
            "total_logs": total_logs,
            "taken_logs": taken_logs,
            "missed_logs": missed_logs,
            "adherence_percentage": adherence_percentage,
        }

    finally:
        db.close()


@app.get("/analytics/trend", tags=["Analytics"])
def adherence_trend(
    days: int = Query(default=30, ge=1, le=365),
    current_user_id: int = Depends(get_current_user_id),
):
    """Per-day taken/missed counts for the last N days (oldest first)."""

    db: Session = SessionLocal()

    try:
        start = datetime.utcnow() - timedelta(days=days - 1)

        logs = (
            db.query(MedicationLog)
            .filter(
                MedicationLog.user_id == current_user_id,
                MedicationLog.scheduled_at >= start,
            )
            .all()
        )

        buckets = {}

        for i in range(days):
            day = (datetime.utcnow() - timedelta(days=days - 1 - i)).date()
            buckets[day.isoformat()] = {
                "date": day.isoformat(),
                "taken": 0,
                "missed": 0,
            }

        for log in logs:
            key = log.scheduled_at.date().isoformat()

            if key in buckets:
                if log.taken:
                    buckets[key]["taken"] += 1
                else:
                    buckets[key]["missed"] += 1

        trend = list(buckets.values())

        for point in trend:
            total = point["taken"] + point["missed"]
            point["total"] = total
            point["adherence"] = (
                round(point["taken"] / total * 100, 1) if total else None
            )

        return {"days": days, "trend": trend}

    finally:
        db.close()


@app.get("/logs/export", tags=["Analytics"])
def export_logs(
    format: str = Query(default="csv", pattern="^(csv)$"),
    current_user_id: int = Depends(get_current_user_id),
):
    """Download medication logs as CSV."""

    db: Session = SessionLocal()

    try:
        logs = (
            db.query(MedicationLog)
            .filter(MedicationLog.user_id == current_user_id)
            .order_by(MedicationLog.scheduled_at.desc())
            .all()
        )

        med_names = {
            m.id: m.medicine_name
            for m in db.query(Medication)
            .filter(Medication.user_id == current_user_id)
            .all()
        }

        buffer = io.StringIO()
        writer = csv.writer(buffer)

        writer.writerow(
            [
                "id",
                "medicine",
                "medication_id",
                "taken",
                "scheduled_at",
                "taken_at",
                "created_at",
            ]
        )

        for log in logs:
            writer.writerow(
                [
                    log.id,
                    med_names.get(log.medication_id, ""),
                    log.medication_id,
                    "taken" if log.taken else "missed",
                    log.scheduled_at.isoformat() if log.scheduled_at else "",
                    log.taken_at.isoformat() if log.taken_at else "",
                    log.created_at.isoformat() if log.created_at else "",
                ]
            )

        buffer.seek(0)

        return StreamingResponse(
            iter([buffer.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=medication_logs.csv"},
        )

    finally:
        db.close()
