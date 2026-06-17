from fastapi import FastAPI
from database import engine, SessionLocal
from models import Base, Medication, User, MedicationLog
print("Creating tables...")
Base.metadata.create_all(bind=engine)
print("Done")

app = FastAPI()




@app.get("/")
def home():
    return {"message": "Medication Reminder Agent Running"}


# -----------------------------
# REGISTER USER
# -----------------------------

@app.post("/register")
def register(
    username: str,
    email: str,
    password: str
):
    db = SessionLocal()

    user = User(
        username=username,
        email=email,
        password=password
    )

    db.add(user)
    db.commit()

    return {"message": "User Registered Successfully"}


# -----------------------------
# LOGIN USER
# -----------------------------

@app.post("/login")
def login(
    email: str,
    password: str
):
    db = SessionLocal()

    user = db.query(User).filter(
        User.email == email
    ).first()

    if user is None:
        return {"message": "User Not Found"}

    if user.password != password:
        return {"message": "Wrong Password"}

    return {"message": "Login Successful"}


# -----------------------------
# ADD MEDICATION
# -----------------------------

@app.post("/add-medication")
def add_medication(
    medicine_name: str,
    dosage: str,
    reminder_time: str,
    frequency: str
):
    db = SessionLocal()

    medication = Medication(
        medicine_name=medicine_name,
        dosage=dosage,
        reminder_time=reminder_time,
        frequency=frequency
    )

    db.add(medication)
    db.commit()

    return {"message": "Medication Added Successfully"}


# -----------------------------
# VIEW ALL MEDICATIONS
# -----------------------------

@app.get("/medications")
def get_medications():

    db = SessionLocal()

    medications = db.query(
        Medication
    ).all()

    result = []

    for med in medications:

        result.append({
            "id": med.id,
            "medicine_name": med.medicine_name,
            "dosage": med.dosage,
            "reminder_time": med.reminder_time,
            "frequency": med.frequency
        })

    return result


# -----------------------------
# GET SINGLE MEDICATION
# -----------------------------

@app.get("/medications/{id}")
def get_medication(id: int):

    db = SessionLocal()

    med = db.query(
        Medication
    ).filter(
        Medication.id == id
    ).first()

    if med is None:
        return {"message": "Medication Not Found"}

    return {
        "id": med.id,
        "medicine_name": med.medicine_name,
        "dosage": med.dosage,
        "reminder_time": med.reminder_time,
        "frequency": med.frequency
    }


# -----------------------------
# UPDATE MEDICATION
# -----------------------------

@app.put("/medications/{id}")
def update_medication(
    id: int,
    medicine_name: str,
    dosage: str,
    reminder_time: str,
    frequency: str
):

    db = SessionLocal()

    med = db.query(
        Medication
    ).filter(
        Medication.id == id
    ).first()

    if med is None:
        return {"message": "Medication Not Found"}

    med.medicine_name = medicine_name
    med.dosage = dosage
    med.reminder_time = reminder_time
    med.frequency = frequency

    db.commit()

    return {"message": "Medication Updated Successfully"}


# -----------------------------
# DELETE MEDICATION
# -----------------------------

@app.delete("/medications/{id}")
def delete_medication(id: int):

    db = SessionLocal()

    med = db.query(
        Medication
    ).filter(
        Medication.id == id
    ).first()

    if med is None:
        return {"message": "Medication Not Found"}

    db.delete(med)
    db.commit()

    return {"message": "Medication Deleted Successfully"}


# -----------------------------
# MARK MEDICINE TAKEN
# -----------------------------

@app.post("/mark-taken/{id}")
def mark_taken(id: int):

    db = SessionLocal()

    medication = db.query(
        Medication
    ).filter(
        Medication.id == id
    ).first()

    if medication is None:
        return {"message": "Medication Not Found"}

    log = MedicationLog(
        medication_id=id,
        taken=True,
        date="2026-06-17"
    )

    db.add(log)
    db.commit()

    return {"message": "Medicine Marked As Taken"}


# -----------------------------
# VIEW LOGS
# -----------------------------

@app.get("/logs")
def get_logs():

    db = SessionLocal()

    logs = db.query(
        MedicationLog
    ).all()

    result = []

    for log in logs:

        result.append({
            "id": log.id,
            "medication_id": log.medication_id,
            "taken": log.taken,
            "date": log.date
        })

    return result


# -----------------------------
# ANALYTICS
# -----------------------------

@app.get("/stats")
def stats():

    db = SessionLocal()

    total_medications = db.query(
        Medication
    ).count()

    total_users = db.query(
        User
    ).count()

    total_logs = db.query(
        MedicationLog
    ).count()

    return {
        "total_medications": total_medications,
        "total_users": total_users,
        "total_logs": total_logs
    }