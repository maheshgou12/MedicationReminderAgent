from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict, field_validator
from typing import Optional
import json
import re

TIME_RE = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)$")


def _validate_time_list(times) -> list:
    if times is None:
        return None

    if not isinstance(times, list):
        raise ValueError("must be a list of HH:MM strings")

    if len(times) > 8:
        raise ValueError("at most 8 dose times allowed")

    cleaned = []

    for t in times:
        t = t.strip() if isinstance(t, str) else ""

        if not TIME_RE.match(t):
            raise ValueError(f"invalid time '{t}': use HH:MM (24h)")

        if t not in cleaned:
            cleaned.append(t)

    return sorted(cleaned)


def _validate_weekdays(days) -> list:
    if days is None:
        return None

    if not isinstance(days, list):
        raise ValueError("must be a list of weekday numbers 0-6")

    cleaned = []

    for d in days:
        if isinstance(d, bool) or not isinstance(d, int):
            raise ValueError("weekdays must be integers 0 (Mon) - 6 (Sun)")

        if d < 0 or d > 6:
            raise ValueError("weekdays must be 0 (Mon) - 6 (Sun)")

        if d not in cleaned:
            cleaned.append(d)

    return sorted(cleaned)


# =========================
# USER SCHEMAS
# =========================


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

    @field_validator("username")
    @classmethod
    def username_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("username is required")
        return v

    @field_validator("password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("password must be at least 6 characters")
        return v


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    timezone: str = "UTC"
    telegram_chat_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =========================
# MEDICATION SCHEMAS
# =========================


class MedicationCreate(BaseModel):
    medicine_name: str
    dosage: str
    reminder_time: str
    frequency: str

    # Smart scheduling (all optional, backward compatible)
    dose_times: Optional[list] = None
    weekdays: Optional[list] = None
    stock_remaining: Optional[int] = None
    stock_threshold: Optional[int] = None
    doses_per_intake: int = 1

    @field_validator("medicine_name", "dosage", "frequency")
    @classmethod
    def not_empty(cls, v: str) -> str:
        v = v.strip() if isinstance(v, str) else v
        if not v:
            raise ValueError("field is required")
        return v

    @field_validator("reminder_time")
    @classmethod
    def valid_time(cls, v: str) -> str:
        v = v.strip() if isinstance(v, str) else ""
        if not TIME_RE.match(v):
            raise ValueError("reminder_time must be HH:MM (24h), e.g. 08:30")
        return v

    @field_validator("dose_times")
    @classmethod
    def valid_dose_times(cls, v):
        return _validate_time_list(v)

    @field_validator("weekdays")
    @classmethod
    def valid_weekdays(cls, v):
        return _validate_weekdays(v)

    @field_validator("stock_remaining", "stock_threshold")
    @classmethod
    def stock_non_negative(cls, v):
        if v is not None and v < 0:
            raise ValueError("stock values cannot be negative")
        return v

    @field_validator("doses_per_intake")
    @classmethod
    def valid_intake(cls, v: int) -> int:
        if v < 1 or v > 20:
            raise ValueError("doses_per_intake must be 1-20")
        return v


class MedicationResponse(BaseModel):
    id: int
    user_id: int
    medicine_name: str
    dosage: str
    reminder_time: str
    frequency: str
    active: bool
    dose_times: Optional[list] = None
    weekdays: Optional[list] = None
    stock_remaining: Optional[int] = None
    stock_threshold: Optional[int] = None
    doses_per_intake: int = 1
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_validator("dose_times", mode="before")
    @classmethod
    def parse_dose_times(cls, v):
        # DB stores a JSON string; API exposes a list
        if v is None or isinstance(v, list):
            return v

        if isinstance(v, str) and v.strip():
            try:
                parsed = json.loads(v)
                return parsed if isinstance(parsed, list) else None
            except (json.JSONDecodeError, ValueError):
                return None

        return None

    @field_validator("weekdays", mode="before")
    @classmethod
    def parse_weekdays(cls, v):
        # DB stores "0,2,4"; API exposes [0, 2, 4]
        if v is None or isinstance(v, list):
            return v

        if isinstance(v, str) and v.strip():
            try:
                return [int(x) for x in v.split(",") if x.strip().isdigit()] or None
            except ValueError:
                return None

        return None


# =========================
# NOTIFICATION SCHEMAS
# =========================


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    medication_id: Optional[int] = None
    type: str
    title: str
    message: str
    read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =========================
# AUTH SCHEMAS
# =========================


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("password must be at least 6 characters")
        return v


class ProfileUpdate(BaseModel):
    username: str
    email: EmailStr
    timezone: Optional[str] = None
    telegram_chat_id: Optional[str] = None

    @field_validator("username")
    @classmethod
    def username_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("username is required")
        return v

    @field_validator("timezone")
    @classmethod
    def valid_timezone(cls, v):
        if v is None:
            return v
        v = v.strip()
        if not v:
            return None
        try:
            from zoneinfo import ZoneInfo

            ZoneInfo(v)
        except Exception:
            raise ValueError(
                f"unknown timezone '{v}' (use IANA name, e.g. Asia/Kolkata)"
            )
        return v


class ReminderSettingsUpdate(BaseModel):
    timezone: Optional[str] = None
    telegram_chat_id: Optional[str] = None

    @field_validator("timezone")
    @classmethod
    def valid_timezone(cls, v):
        if v is None:
            return v
        v = v.strip()
        if not v:
            return None
        try:
            from zoneinfo import ZoneInfo

            ZoneInfo(v)
        except Exception:
            raise ValueError(
                f"unknown timezone '{v}' (use IANA name, e.g. Asia/Kolkata)"
            )
        return v


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("password must be at least 6 characters")
        return v


# =========================
# AI SCHEMAS
# =========================


class InteractionMed(BaseModel):
    name: str
    dosage: Optional[str] = ""


class InteractionRequest(BaseModel):
    medications: list[InteractionMed]


class ChatRequest(BaseModel):
    message: str

    @field_validator("message")
    @classmethod
    def message_not_empty(cls, v: str) -> str:
        v = v.strip() if isinstance(v, str) else ""
        if not v:
            raise ValueError("message is required")
        if len(v) > 2000:
            raise ValueError("message too long (max 2000 chars)")
        return v
