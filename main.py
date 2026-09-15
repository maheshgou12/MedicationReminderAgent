from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm

from sqlalchemy.orm import Session

from database import Base, engine, SessionLocal

from models import (
    User,
    Medication,
    MedicationLog,
    ReminderEvent
)

from schemas import (
    UserCreate,
    UserResponse,
    MedicationCreate,
    MedicationResponse
)

from security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user_id
)

from scheduler import (
    start_scheduler,
    stop_scheduler
)

from ai_service import (
    generate_medication_advice,
    generate_adherence_analysis,
    generate_ai_action
)


# ============================================================
# DATABASE INITIALIZATION
# ============================================================

print("Creating tables...")

Base.metadata.create_all(bind=engine)

print("Done")


# ============================================================
# APPLICATION LIFESPAN
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):

    start_scheduler()

    yield

    stop_scheduler()


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="Medication Reminder Agent",
    description="AI-powered medication management and reminder system",
    version="1.0.0",
    lifespan=lifespan
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():

    return {
        "message": "Medication Reminder Agent Running",
        "status": "active"
    }


# ============================================================
# USER CRUD
# ============================================================


# ------------------------------------------------------------
# CREATE USER
# ------------------------------------------------------------

@app.post(
    "/users",
    response_model=UserResponse,
    status_code=201,
    tags=["Users"]
)
def create_user(
    user_data: UserCreate
):

    db: Session = SessionLocal()

    try:

        existing_user = db.query(User).filter(
            User.email == user_data.email
        ).first()

        if existing_user:

            raise HTTPException(
                status_code=409,
                detail="Email already registered"
            )

        hashed_password = hash_password(
            user_data.password
        )

        user = User(
            username=user_data.username,
            email=user_data.email,
            password=hashed_password
        )

        db.add(user)

        db.commit()

        db.refresh(user)

        return user

    finally:

        db.close()


# ------------------------------------------------------------
# GET ALL USERS
# ------------------------------------------------------------

@app.get(
    "/users",
    response_model=list[UserResponse],
    tags=["Users"]
)
def get_users():

    db: Session = SessionLocal()

    try:

        users = db.query(User).order_by(
            User.id
        ).all()

        return users

    finally:

        db.close()


# ------------------------------------------------------------
# GET SINGLE USER
# ------------------------------------------------------------

@app.get(
    "/users/{user_id}",
    response_model=UserResponse,
    tags=["Users"]
)
def get_user(
    user_id: int
):

    db: Session = SessionLocal()

    try:

        user = db.query(User).filter(
            User.id == user_id
        ).first()

        if user is None:

            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        return user

    finally:

        db.close()


# ------------------------------------------------------------
# UPDATE USER
# ------------------------------------------------------------

@app.put(
    "/users/{user_id}",
    response_model=UserResponse,
    tags=["Users"]
)
def update_user(
    user_id: int,
    user_data: UserCreate
):

    db: Session = SessionLocal()

    try:

        user = db.query(User).filter(
            User.id == user_id
        ).first()

        if user is None:

            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        duplicate_email = db.query(User).filter(
            User.email == user_data.email,
            User.id != user_id
        ).first()

        if duplicate_email:

            raise HTTPException(
                status_code=409,
                detail="Email already registered"
            )

        user.username = user_data.username

        user.email = user_data.email

        user.password = hash_password(
            user_data.password
        )

        db.commit()

        db.refresh(user)

        return user

    finally:

        db.close()


# ------------------------------------------------------------
# DELETE USER
# ------------------------------------------------------------

@app.delete(
    "/users/{user_id}",
    tags=["Users"]
)
def delete_user(
    user_id: int
):

    db: Session = SessionLocal()

    try:

        user = db.query(User).filter(
            User.id == user_id
        ).first()

        if user is None:

            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        db.delete(user)

        db.commit()

        return {
            "message": "User deleted successfully",
            "user_id": user_id
        }

    finally:

        db.close()


# ============================================================
# AUTHENTICATION
# ============================================================


# ------------------------------------------------------------
# REGISTER
# ------------------------------------------------------------

@app.post(
    "/register",
    tags=["Authentication"]
)
def register(
    username: str,
    email: str,
    password: str
):

    db: Session = SessionLocal()

    try:

        existing_user = db.query(User).filter(
            User.email == email
        ).first()

        if existing_user:

            raise HTTPException(
                status_code=409,
                detail="Email already registered"
            )

        hashed_password = hash_password(
            password
        )

        user = User(
            username=username,
            email=email,
            password=hashed_password
        )

        db.add(user)

        db.commit()

        db.refresh(user)

        return {
            "message": "User Registered Successfully",
            "user_id": user.id
        }

    finally:

        db.close()


# ------------------------------------------------------------
# LOGIN
# ------------------------------------------------------------

@app.post(
    "/login",
    tags=["Authentication"]
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends()
):

    db: Session = SessionLocal()

    try:

        email = form_data.username

        password = form_data.password

        user = db.query(User).filter(
            User.email == email
        ).first()

        if user is None:

            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        if not verify_password(
            password,
            user.password
        ):

            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        access_token = create_access_token(
            user.id
        )

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": user.id,
            "username": user.username,
            "email": user.email
        }

    finally:

        db.close()


# ============================================================
# MEDICATION CRUD
# ============================================================


# ------------------------------------------------------------
# ADD MEDICATION
# ------------------------------------------------------------

@app.post(
    "/users/{user_id}/medications",
    response_model=MedicationResponse,
    status_code=201,
    tags=["Medications"]
)
def add_medication(
    user_id: int,
    medication_data: MedicationCreate,
    current_user_id: int = Depends(get_current_user_id)
):

    if user_id != current_user_id:

        raise HTTPException(
            status_code=403,
            detail="You cannot access another user's medications"
        )

    db: Session = SessionLocal()

    try:

        user = db.query(User).filter(
            User.id == user_id
        ).first()

        if user is None:

            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        medication = Medication(
            user_id=user_id,
            medicine_name=medication_data.medicine_name,
            dosage=medication_data.dosage,
            reminder_time=medication_data.reminder_time,
            frequency=medication_data.frequency,
            active=True
        )

        db.add(medication)

        db.commit()

        db.refresh(medication)

        return medication

    finally:

        db.close()


# ------------------------------------------------------------
# GET USER MEDICATIONS
# ------------------------------------------------------------

@app.get(
    "/users/{user_id}/medications",
    response_model=list[MedicationResponse],
    tags=["Medications"]
)
def get_user_medications(
    user_id: int,
    current_user_id: int = Depends(get_current_user_id)
):

    if user_id != current_user_id:

        raise HTTPException(
            status_code=403,
            detail="You cannot access another user's medications"
        )

    db: Session = SessionLocal()

    try:

        medications = db.query(Medication).filter(
            Medication.user_id == user_id
        ).order_by(
            Medication.id
        ).all()

        return medications

    finally:

        db.close()


# ------------------------------------------------------------
# GET ALL CURRENT USER MEDICATIONS
# ------------------------------------------------------------

@app.get(
    "/medications",
    response_model=list[MedicationResponse],
    tags=["Medications"]
)
def get_medications(
    current_user_id: int = Depends(get_current_user_id)
):

    db: Session = SessionLocal()

    try:

        medications = db.query(Medication).filter(
            Medication.user_id == current_user_id
        ).order_by(
            Medication.id
        ).all()

        return medications

    finally:

        db.close()


# ------------------------------------------------------------
# GET SINGLE MEDICATION
# ------------------------------------------------------------

@app.get(
    "/medications/{medication_id}",
    response_model=MedicationResponse,
    tags=["Medications"]
)
def get_medication(
    medication_id: int,
    current_user_id: int = Depends(get_current_user_id)
):

    db: Session = SessionLocal()

    try:

        medication = db.query(Medication).filter(
            Medication.id == medication_id
        ).first()

        if medication is None:

            raise HTTPException(
                status_code=404,
                detail="Medication not found"
            )

        if medication.user_id != current_user_id:

            raise HTTPException(
                status_code=403,
                detail="You cannot access this medication"
            )

        return medication

    finally:

        db.close()


# ------------------------------------------------------------
# UPDATE MEDICATION
# ------------------------------------------------------------

@app.put(
    "/medications/{medication_id}",
    response_model=MedicationResponse,
    tags=["Medications"]
)
def update_medication(
    medication_id: int,
    medication_data: MedicationCreate,
    current_user_id: int = Depends(get_current_user_id)
):

    db: Session = SessionLocal()

    try:

        medication = db.query(Medication).filter(
            Medication.id == medication_id
        ).first()

        if medication is None:

            raise HTTPException(
                status_code=404,
                detail="Medication not found"
            )

        if medication.user_id != current_user_id:

            raise HTTPException(
                status_code=403,
                detail="You cannot modify this medication"
            )

        medication.medicine_name = (
            medication_data.medicine_name
        )

        medication.dosage = (
            medication_data.dosage
        )

        medication.reminder_time = (
            medication_data.reminder_time
        )

        medication.frequency = (
            medication_data.frequency
        )

        medication.updated_at = datetime.utcnow()

        db.commit()

        db.refresh(medication)

        return medication

    finally:

        db.close()


# ------------------------------------------------------------
# ACTIVATE / DEACTIVATE
# ------------------------------------------------------------

@app.patch(
    "/medications/{medication_id}/status",
    tags=["Medications"]
)
def update_medication_status(
    medication_id: int,
    active: bool,
    current_user_id: int = Depends(get_current_user_id)
):

    db: Session = SessionLocal()

    try:

        medication = db.query(Medication).filter(
            Medication.id == medication_id
        ).first()

        if medication is None:

            raise HTTPException(
                status_code=404,
                detail="Medication not found"
            )

        if medication.user_id != current_user_id:

            raise HTTPException(
                status_code=403,
                detail="You cannot modify this medication"
            )

        medication.active = active

        medication.updated_at = datetime.utcnow()

        db.commit()

        return {
            "message": "Medication status updated",
            "medication_id": medication_id,
            "active": active
        }

    finally:

        db.close()


# ------------------------------------------------------------
# DELETE MEDICATION
# ------------------------------------------------------------

@app.delete(
    "/medications/{medication_id}",
    tags=["Medications"]
)
def delete_medication(
    medication_id: int,
    current_user_id: int = Depends(get_current_user_id)
):

    db: Session = SessionLocal()

    try:

        medication = db.query(Medication).filter(
            Medication.id == medication_id
        ).first()

        if medication is None:

            raise HTTPException(
                status_code=404,
                detail="Medication not found"
            )

        if medication.user_id != current_user_id:

            raise HTTPException(
                status_code=403,
                detail="You cannot delete this medication"
            )

        db.delete(medication)

        db.commit()

        return {
            "message": "Medication deleted successfully",
            "medication_id": medication_id
        }

    finally:

        db.close()


# ============================================================
# MEDICATION LOGS
# ============================================================


# ------------------------------------------------------------
# MARK MEDICATION AS TAKEN
# ------------------------------------------------------------

@app.post(
    "/medications/{medication_id}/taken",
    tags=["Medication Logs"]
)
def mark_medication_taken(
    medication_id: int,
    current_user_id: int = Depends(get_current_user_id)
):

    db: Session = SessionLocal()

    try:

        medication = db.query(Medication).filter(
            Medication.id == medication_id,
            Medication.user_id == current_user_id
        ).first()

        if medication is None:

            raise HTTPException(
                status_code=404,
                detail="Medication not found"
            )

        now = datetime.now()

        reminder_event = db.query(
            ReminderEvent
        ).filter(
            ReminderEvent.medication_id == medication_id,
            ReminderEvent.user_id == current_user_id,
            ReminderEvent.status == "PENDING",
            ReminderEvent.scheduled_at <= now
        ).order_by(
            ReminderEvent.scheduled_at.desc()
        ).first()

        if reminder_event:

            reminder_event.status = "TAKEN"

        medication_log = MedicationLog(
            user_id=current_user_id,
            medication_id=medication_id,
            taken=True,
            scheduled_at=(
                reminder_event.scheduled_at
                if reminder_event
                else now
            ),
            taken_at=now
        )

        db.add(medication_log)

        db.commit()

        db.refresh(medication_log)

        return {
            "message": "Medicine marked as taken",
            "log_id": medication_log.id,
            "medication_id": medication_id,
            "taken": True,
            "taken_at": medication_log.taken_at,
            "reminder_event_id": (
                reminder_event.id
                if reminder_event
                else None
            ),
            "reminder_status": (
                reminder_event.status
                if reminder_event
                else None
            )
        }

    except HTTPException:

        db.rollback()

        raise

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        db.close()


# ------------------------------------------------------------
# MARK MEDICATION AS MISSED
# ------------------------------------------------------------

@app.post(
    "/medications/{medication_id}/missed",
    tags=["Medication Logs"]
)
def mark_medication_missed(
    medication_id: int,
    current_user_id: int = Depends(get_current_user_id)
):

    db: Session = SessionLocal()

    try:

        medication = db.query(Medication).filter(
            Medication.id == medication_id
        ).first()

        if medication is None:

            raise HTTPException(
                status_code=404,
                detail="Medication not found"
            )

        if medication.user_id != current_user_id:

            raise HTTPException(
                status_code=403,
                detail="You cannot access this medication"
            )

        now = datetime.utcnow()

        log = MedicationLog(
            user_id=medication.user_id,
            medication_id=medication.id,
            taken=False,
            scheduled_at=now,
            taken_at=None
        )

        db.add(log)

        db.commit()

        db.refresh(log)

        return {
            "message": "Medicine marked as missed",
            "log_id": log.id,
            "medication_id": medication.id,
            "taken": False
        }

    finally:

        db.close()


# ------------------------------------------------------------
# GET CURRENT USER LOGS
# ------------------------------------------------------------

@app.get(
    "/logs",
    tags=["Medication Logs"]
)
def get_logs(
    current_user_id: int = Depends(get_current_user_id)
):

    db: Session = SessionLocal()

    try:

        logs = db.query(
            MedicationLog
        ).filter(
            MedicationLog.user_id == current_user_id
        ).order_by(
            MedicationLog.id.desc()
        ).all()

        result = []

        for log in logs:

            result.append({
                "id": log.id,
                "user_id": log.user_id,
                "medication_id": log.medication_id,
                "taken": log.taken,
                "scheduled_at": log.scheduled_at,
                "taken_at": log.taken_at,
                "created_at": log.created_at
            })

        return result

    finally:

        db.close()


# ------------------------------------------------------------
# GET USER LOGS
# ------------------------------------------------------------

@app.get(
    "/users/{user_id}/logs",
    tags=["Medication Logs"]
)
def get_user_logs(
    user_id: int,
    current_user_id: int = Depends(get_current_user_id)
):

    if user_id != current_user_id:

        raise HTTPException(
            status_code=403,
            detail="You cannot access another user's logs"
        )

    db: Session = SessionLocal()

    try:

        logs = db.query(
            MedicationLog
        ).filter(
            MedicationLog.user_id == user_id
        ).order_by(
            MedicationLog.id.desc()
        ).all()

        result = []

        for log in logs:

            result.append({
                "id": log.id,
                "medication_id": log.medication_id,
                "taken": log.taken,
                "scheduled_at": log.scheduled_at,
                "taken_at": log.taken_at,
                "created_at": log.created_at
            })

        return result

    finally:

        db.close()


# ============================================================
# REMINDERS
# ============================================================


# ------------------------------------------------------------
# GET REMINDERS
# ------------------------------------------------------------

@app.get(
    "/reminders",
    tags=["Reminders"]
)
def get_reminders(
    current_user_id: int = Depends(get_current_user_id)
):

    db: Session = SessionLocal()

    try:

        reminders = db.query(
            ReminderEvent
        ).filter(
            ReminderEvent.user_id == current_user_id
        ).order_by(
            ReminderEvent.scheduled_at.desc()
        ).all()

        return reminders

    finally:

        db.close()


# ------------------------------------------------------------
# GET USER REMINDERS
# ------------------------------------------------------------

@app.get(
    "/users/{user_id}/reminders",
    tags=["Reminders"]
)
def get_user_reminders(
    user_id: int,
    current_user_id: int = Depends(get_current_user_id)
):

    if user_id != current_user_id:

        raise HTTPException(
            status_code=403,
            detail="Not authorized to access these reminders"
        )

    db: Session = SessionLocal()

    try:

        reminders = db.query(
            ReminderEvent
        ).filter(
            ReminderEvent.user_id == user_id
        ).order_by(
            ReminderEvent.scheduled_at.desc()
        ).all()

        return reminders

    finally:

        db.close()


# ============================================================
# AI AGENT
# ============================================================


# ------------------------------------------------------------
# MEDICATION ADVICE
# ------------------------------------------------------------

@app.post(
    "/ai/medication-advice",
    tags=["AI Agent"]
)
def medication_advice(
    medicine_name: str,
    dosage: str,
    symptom: str,
    current_user_id: int = Depends(get_current_user_id)
):

    return generate_medication_advice(
        medicine_name=medicine_name,
        dosage=dosage,
        symptom=symptom
    )


# ------------------------------------------------------------
# AI ADHERENCE ANALYSIS
# ------------------------------------------------------------

@app.get(
    "/ai/medications/{medication_id}/adherence",
    tags=["AI Agent"]
)
def analyze_medication_adherence(
    medication_id: int,
    current_user_id: int = Depends(get_current_user_id)
):

    db: Session = SessionLocal()

    try:

        medication = db.query(Medication).filter(
            Medication.id == medication_id,
            Medication.user_id == current_user_id
        ).first()

        if medication is None:

            raise HTTPException(
                status_code=404,
                detail="Medication not found"
            )

        logs = db.query(
            MedicationLog
        ).filter(
            MedicationLog.medication_id == medication_id,
            MedicationLog.user_id == current_user_id
        ).order_by(
            MedicationLog.scheduled_at.desc()
        ).all()

        return generate_adherence_analysis(
            medication=medication,
            logs=logs
        )

    finally:

        db.close()


# ------------------------------------------------------------
# AI RECOMMENDATION
# ------------------------------------------------------------

@app.get(
    "/ai/medications/{medication_id}/recommendation",
    tags=["AI Agent"]
)
def medication_recommendation(
    medication_id: int,
    current_user_id: int = Depends(get_current_user_id)
):

    db: Session = SessionLocal()

    try:

        medication = db.query(Medication).filter(
            Medication.id == medication_id,
            Medication.user_id == current_user_id
        ).first()

        if medication is None:

            raise HTTPException(
                status_code=404,
                detail="Medication not found"
            )

        logs = db.query(
            MedicationLog
        ).filter(
            MedicationLog.medication_id == medication_id,
            MedicationLog.user_id == current_user_id
        ).all()

        total = len(logs)

        taken_count = sum(
            1 for log in logs
            if log.taken
        )

        missed_count = total - taken_count

        adherence_percentage = 0

        if total > 0:

            adherence_percentage = round(
                (taken_count / total) * 100,
                2
            )

        ai_action = generate_ai_action(
            adherence_percentage,
            missed_count
        )

        return {
            "medication_id": medication.id,
            "medicine": medication.medicine_name,
            "dosage": medication.dosage,
            "total_records": total,
            "taken_count": taken_count,
            "missed_count": missed_count,
            "adherence_percentage": adherence_percentage,
            "ai_recommendation": ai_action
        }

    finally:

        db.close()


# ============================================================
# ANALYTICS / STATS
# ============================================================

@app.get(
    "/stats",
    tags=["Analytics"]
)
def stats(
    current_user_id: int = Depends(get_current_user_id)
):

    db: Session = SessionLocal()

    try:

        total_medications = db.query(
            Medication
        ).filter(
            Medication.user_id == current_user_id
        ).count()

        active_medications = db.query(
            Medication
        ).filter(
            Medication.user_id == current_user_id,
            Medication.active == True
        ).count()

        total_logs = db.query(
            MedicationLog
        ).filter(
            MedicationLog.user_id == current_user_id
        ).count()

        taken_logs = db.query(
            MedicationLog
        ).filter(
            MedicationLog.user_id == current_user_id,
            MedicationLog.taken == True
        ).count()

        missed_logs = db.query(
            MedicationLog
        ).filter(
            MedicationLog.user_id == current_user_id,
            MedicationLog.taken == False
        ).count()

        adherence_percentage = 0

        if total_logs > 0:

            adherence_percentage = round(
                (taken_logs / total_logs) * 100,
                2
            )

        return {
            "total_medications": total_medications,
            "active_medications": active_medications,
            "total_logs": total_logs,
            "taken_logs": taken_logs,
            "missed_logs": missed_logs,
            "adherence_percentage": adherence_percentage
        }

    finally:

        db.close()



