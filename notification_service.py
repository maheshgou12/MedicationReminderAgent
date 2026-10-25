import os
import smtplib
import urllib.request
import json

from email.message import EmailMessage
from dotenv import load_dotenv


load_dotenv()


SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

# Optional generic webhook (Slack/Discord/SMS gateway) for reminders.
# POSTs JSON {"text": ...} when set.
WEBHOOK_URL = os.getenv("NOTIFICATION_WEBHOOK_URL")
APP_NAME = os.getenv("APP_NAME", "Medication Reminder Agent")

# Optional Telegram bot for reminders. Set TELEGRAM_BOT_TOKEN to enable;
# per-user chat ids (User.telegram_chat_id) take precedence over the
# global TELEGRAM_CHAT_ID fallback.
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")


def create_notification(
    db,
    user_id: int,
    type: str,
    title: str,
    message: str = "",
    medication_id: int | None = None,
):
    """Persist an in-app notification (dedupe identical unread ones)."""

    from models import Notification

    existing = (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.type == type,
            Notification.title == title,
            Notification.read == False,  # noqa: E712
        )
        .first()
    )

    if existing:
        return existing

    notification = Notification(
        user_id=user_id,
        medication_id=medication_id,
        type=type,
        title=title,
        message=message,
        read=False,
    )

    db.add(notification)

    return notification


def get_smtp_settings():
    load_dotenv(override=True)
    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USERNAME")
    password = os.getenv("SMTP_PASSWORD")
    if password:
        password = password.strip()
    return host, port, user, password


def is_deliverable_email(email: str) -> bool:
    if not email or "@" not in email:
        return False
    domain = email.split("@")[-1].strip().lower()
    if domain in ("example.com", "test.com", "sample.com", "localhost", "invalid"):
        return False
    return True


def is_smtp_configured() -> bool:
    host, port, user, password = get_smtp_settings()
    if not host or not user or not password:
        return False
    user_str = str(user).lower()
    pass_str = str(password).lower()
    if "placeholder" in user_str or "placeholder" in pass_str:
        return False
    return True


def send_reminder_email(
    recipient_email: str,
    medicine_name: str,
    dosage: str,
    reminder_time: str,
    frequency: str,
):
    # Skip gracefully when email is not configured (local dev)
    if not is_smtp_configured() or not is_deliverable_email(recipient_email):
        return False

    host, port, user, password = get_smtp_settings()

    try:
        message = EmailMessage()
        message["From"] = user
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

{APP_NAME}
"""
        )

        with smtplib.SMTP(host, port, timeout=15) as server:
            server.starttls()
            server.login(user, password)
            server.send_message(message)

        print(f"[EMAIL] Reminder email sent to {recipient_email}")

        send_webhook_message(
            f"Medication Reminder - {medicine_name} ({dosage}) at {reminder_time}"
        )

        return True

    except Exception as e:
        print(f"Email notification error: {e}")
        return False


def send_webhook_message(text: str) -> bool:
    """Optional push/SMS-style hook. No-op when unconfigured."""

    if not WEBHOOK_URL:
        return False

    try:
        request = urllib.request.Request(
            WEBHOOK_URL,
            data=json.dumps({"text": f"[{APP_NAME}] {text}"}).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        with urllib.request.urlopen(request, timeout=10):
            pass

        print("[WEBHOOK] Notification sent")

        return True

    except Exception as e:
        print(f"Webhook notification error: {e}")

        return False


def send_telegram_message(text: str, chat_id: str | None = None) -> bool:
    """Send a Telegram message via bot. No-op when unconfigured."""

    token = TELEGRAM_BOT_TOKEN
    target = chat_id or TELEGRAM_CHAT_ID

    if not token or not target:
        return False

    try:
        request = urllib.request.Request(
            f"https://api.telegram.org/bot{token}/sendMessage",
            data=json.dumps(
                {"chat_id": target, "text": f"[{APP_NAME}] {text}"}
            ).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        with urllib.request.urlopen(request, timeout=10):
            pass

        print("[TELEGRAM] Notification sent")

        return True

    except Exception as e:
        print(f"Telegram notification error: {e}")

        return False


def get_frontend_url() -> str:
    explicit = os.getenv("FRONTEND_URL")
    if explicit:
        return explicit.rstrip("/")

    import socket

    host = "127.0.0.1"
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            host = s.getsockname()[0]
    except Exception:
        host = "localhost"

    for port in (5173, 5174, 5175, 3000):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(0.2)
                if s.connect_ex(("127.0.0.1", port)) == 0:
                    return f"http://{host}:{port}"
        except Exception:
            continue

    return f"http://{host}:5173"


def send_welcome_email(recipient_email: str, username: str) -> bool:
    """Send welcome email when any new user registers an account."""
    if not is_smtp_configured() or not is_deliverable_email(recipient_email):
        return False

    host, port, user, password = get_smtp_settings()
    frontend_url = get_frontend_url()

    try:
        message = EmailMessage()
        message["From"] = user
        message["To"] = recipient_email
        message["Subject"] = f"Welcome to {APP_NAME}!"

        plain_text = f"""Hello {username},

Welcome to {APP_NAME}!

Your account has been registered successfully:
{frontend_url}/login

Best regards,
{APP_NAME}
"""
        html_content = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0; text-align: center;">
    <div style="font-size: 36px; margin-bottom: 12px;">💊</div>
    <h2 style="color: #1e293b; margin: 0 0 16px 0;">Welcome, {username}!</h2>
    <p style="color: #475569; font-size: 15px; margin: 0 0 24px 0;">
      Your account with <strong>{APP_NAME}</strong> has been created.
    </p>
    <a href="{frontend_url}/login" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
      Log In
    </a>
  </div>
</body>
</html>
"""
        message.set_content(plain_text)
        message.add_alternative(html_content, subtype="html")

        with smtplib.SMTP(host, port, timeout=15) as server:
            server.starttls()
            server.login(user, password)
            server.send_message(message)

        print(f"[EMAIL] Welcome email sent successfully to {recipient_email}")
        return True

    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send welcome email to {recipient_email}: {e}")
        return False


def send_password_reset_email(recipient_email: str, token: str) -> bool:
    """Send a 1-click password reset link directly to the user's email inbox."""

    if not is_smtp_configured() or not is_deliverable_email(recipient_email):
        return False

    host, port, user, password = get_smtp_settings()
    frontend_url = get_frontend_url()
    reset_link = f"{frontend_url}/reset-password?token={token}"

    try:
        message = EmailMessage()
        message["From"] = user
        message["To"] = recipient_email
        message["Subject"] = f"Reset Your Password - {APP_NAME}"

        plain_text = f"""Hello,

Click the link below to set a new password:
{reset_link}

Best regards,
{APP_NAME}
"""

        html_content = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0; text-align: center;">
    <div style="font-size: 36px; margin-bottom: 12px;">🔑</div>
    <h2 style="color: #1e293b; margin: 0 0 12px 0;">Reset Your Password</h2>
    <p style="color: #475569; font-size: 15px; margin: 0 0 24px 0;">
      Click the button below to set a new password:
    </p>
    <div style="margin: 24px 0;">
      <a href="{reset_link}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Reset Password
      </a>
    </div>
    <p style="color: #64748b; font-size: 13px; margin: 24px 0 0 0; border-top: 1px solid #f1f5f9; padding-top: 16px;">
      Or open this link: <a href="{reset_link}" style="color: #4f46e5; word-break: break-all;">{reset_link}</a>
    </p>
  </div>
</body>
</html>
"""
        message.set_content(plain_text)
        message.add_alternative(html_content, subtype="html")

        with smtplib.SMTP(host, port, timeout=15) as server:
            server.starttls()
            server.login(user, password)
            server.send_message(message)

        print(f"[EMAIL] Password reset email sent successfully to {recipient_email}")

        return True

    except Exception as e:
        print(f"Password reset email error: {e}")
        return False
