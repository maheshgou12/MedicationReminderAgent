from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey
)

from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    username = Column(
        String(100),
        nullable=False
    )

    email = Column(
        String(255),
        unique=True,
        index=True,
        nullable=False
    )

    password = Column(
        String(255),
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    medications = relationship(
        "Medication",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    medication_logs = relationship(
        "MedicationLog",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    reminder_events = relationship(
    "ReminderEvent",
    back_populates="user",
    cascade="all, delete-orphan"
)
    


class Medication(Base):
    __tablename__ = "medications"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    medicine_name = Column(
        String(150),
        nullable=False
    )

    dosage = Column(
        String(100),
        nullable=False
    )

    reminder_events = relationship(
    "ReminderEvent",
    back_populates="medication",
    cascade="all, delete-orphan"
)

    

    reminder_time = Column(
        String(20),
        nullable=False
    )

    frequency = Column(
        String(50),
        nullable=False
    )

    active = Column(
        Boolean,
        default=True,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    user = relationship(
        "User",
        back_populates="medications"
    )

    medication_logs = relationship(
        "MedicationLog",
        back_populates="medication",
        cascade="all, delete-orphan"
    )


class MedicationLog(Base):
    __tablename__ = "medication_logs"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    medication_id = Column(
        Integer,
        ForeignKey("medications.id"),
        nullable=False,
        index=True
    )

    taken = Column(
        Boolean,
        default=False,
        nullable=False
    )

    scheduled_at = Column(
        DateTime,
        nullable=False
    )

    taken_at = Column(
        DateTime,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    user = relationship(
        "User",
        back_populates="medication_logs"
    )

    medication = relationship(
        "Medication",
        back_populates="medication_logs"
    )



class ReminderEvent(Base):
    __tablename__ = "reminder_events"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    medication_id = Column(
        Integer,
        ForeignKey("medications.id"),
        nullable=False,
        index=True
    )

    scheduled_at = Column(
        DateTime,
        nullable=False
    )

    status = Column(
        String(20),
        nullable=False,
        default="PENDING"
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    user = relationship(
        "User",
        back_populates="reminder_events"
    )

    medication = relationship(
        "Medication",
        back_populates="reminder_events"
    )



    