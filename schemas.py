from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict


# =========================
# USER SCHEMAS
# =========================

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
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


class MedicationResponse(BaseModel):
    id: int
    user_id: int
    medicine_name: str
    dosage: str
    reminder_time: str
    frequency: str
    active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    