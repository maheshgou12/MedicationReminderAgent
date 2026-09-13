import os
import smtplib

from email.message import EmailMessage
from dotenv import load_dotenv


load_dotenv()


SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")


def send_reminder_email(
    recipient_email: str,
    medicine_name: str,
    dosage: str,
    reminder_time: str,
    frequency: str
):

    try:

        message = EmailMessage()

        message["From"] = SMTP_USERNAME
        message["To"] = recipient_email
        message["Subject"] = f"💊 Medication Reminder - {medicine_name}"

        message.set_content(
            f"""
Medication Reminder

Medicine: {medicine_name}
Dosage: {dosage}
Reminder Time: {reminder_time}
Frequency: {frequency}

Please take your medication on time.

Medication Reminder Agent
"""
        )

        with smtplib.SMTP(
            SMTP_HOST,
            SMTP_PORT
        ) as server:

            server.starttls()

            server.login(
                SMTP_USERNAME,
                SMTP_PASSWORD
            )

            server.send_message(message)

        print(
            f"📧 Reminder email sent to {recipient_email}"
        )

        return True

    except Exception as e:

        print(
            f"Email notification error: {e}"
        )

        return False


    