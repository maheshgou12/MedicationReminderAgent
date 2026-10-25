from datetime import datetime

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text

from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    username = Column(String(100), nullable=False)

    email = Column(String(255), unique=True, index=True, nullable=False)

    password = Column(String(255), nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # IANA timezone name, e.g. "Asia/Kolkata". Default UTC.
    timezone = Column(String(64), nullable=False, default="UTC")

    # Optional per-user Telegram chat id for reminder delivery.
    telegram_chat_id = Column(String(64), nullable=True)

    medications = relationship(
        "Medication", back_populates="user", cascade="all, delete-orphan"
    )

    medication_logs = relationship(
        "MedicationLog", back_populates="user", cascade="all, delete-orphan"
    )

    reminder_events = relationship(
        "ReminderEvent", back_populates="user", cascade="all, delete-orphan"
    )

    notifications = relationship(
        "Notification", back_populates="user", cascade="all, delete-orphan"
    )

    refresh_tokens = relationship(
        "RefreshToken", back_populates="user", cascade="all, delete-orphan"
    )

    password_reset_tokens = relationship(
        "PasswordResetToken", back_populates="user", cascade="all, delete-orphan"
    )


class Medication(Base):
    __tablename__ = "medications"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    medicine_name = Column(String(150), nullable=False)

    dosage = Column(String(100), nullable=False)

    reminder_events = relationship(
        "ReminderEvent", back_populates="medication", cascade="all, delete-orphan"
    )

    reminder_time = Column(String(20), nullable=False)

    frequency = Column(String(50), nullable=False)

    active = Column(Boolean, default=True, nullable=False)

    # ---- Smart scheduling (nullable for backward compat) ----
    # JSON list of extra daily dose times, e.g. '["08:00", "20:00"]'.
    # The legacy `reminder_time` is always treated as a dose time.
    dose_times = Column(Text, nullable=True)

    # Comma-separated weekday numbers 0=Mon..6=Sun, e.g. "0,2,4".
    # NULL/empty means every day.
    weekdays = Column(String(20), nullable=True)

    # ---- Refill tracking ----
    stock_remaining = Column(Integer, nullable=True)

    stock_threshold = Column(Integer, nullable=True)

    doses_per_intake = Column(Integer, default=1, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    user = relationship("User", back_populates="medications")

    medication_logs = relationship(
        "MedicationLog", back_populates="medication", cascade="all, delete-orphan"
    )

    notifications = relationship(
        "Notification", back_populates="medication", cascade="all, delete-orphan"
    )


class MedicationLog(Base):
    __tablename__ = "medication_logs"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    medication_id = Column(
        Integer, ForeignKey("medications.id"), nullable=False, index=True
    )

    taken = Column(Boolean, default=False, nullable=False)

    scheduled_at = Column(DateTime, nullable=False)

    taken_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="medication_logs")

    medication = relationship("Medication", back_populates="medication_logs")


class ReminderEvent(Base):
    __tablename__ = "reminder_events"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    medication_id = Column(
        Integer, ForeignKey("medications.id"), nullable=False, index=True
    )

    scheduled_at = Column(DateTime, nullable=False)

    status = Column(String(20), nullable=False, default="PENDING")

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="reminder_events")

    medication = relationship("Medication", back_populates="reminder_events")


class Notification(Base):
    """In-app notification center entries."""

    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    medication_id = Column(
        Integer, ForeignKey("medications.id"), nullable=True, index=True
    )

    # REMINDER | MISSED | LOW_STOCK | ESCALATION | INFO
    type = Column(String(30), nullable=False, default="INFO")

    title = Column(String(200), nullable=False)

    message = Column(Text, nullable=False, default="")

    read = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="notifications")

    medication = relationship("Medication", back_populates="notifications")


class RefreshToken(Base):
    """Long-lived tokens for silent access-token renewal."""

    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    token_hash = Column(String(255), unique=True, index=True, nullable=False)

    expires_at = Column(DateTime, nullable=False)

    revoked = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="refresh_tokens")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    token_hash = Column(String(255), unique=True, index=True, nullable=False)

    expires_at = Column(DateTime, nullable=False)

    used = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="password_reset_tokens")
