from apscheduler.schedulers.background import BackgroundScheduler
from database import SessionLocal
from models import Medication
from datetime import datetime
from ai_service import generate_reminder_message

scheduler = BackgroundScheduler()

def check_reminders():

    db = SessionLocal()

    current_time = datetime.now().strftime("%I.%M%p")

    print("\nCurrent Time:", current_time)

    medications = db.query(Medication).all()

    for med in medications:

        print("Checking:", med.reminder_time)

        if med.reminder_time == current_time:

            message = generate_reminder_message(
                med.medicine_name,
                med.dosage
            )

            print("\n🤖 AI MEDICATION REMINDER 🤖")
            print(message)
            print("---------------------------")

scheduler.add_job(
    check_reminders,
    "interval",
    minutes=1
)

scheduler.start()