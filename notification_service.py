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
    host = os.getenv("SMTP_HOST") or "smtp.gmail.com"
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USERNAME") or "maheshburra2712@gmail.com"
    password = os.getenv("SMTP_PASSWORD") or "kgsh sfcb irwd mxna"
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


def send_email_via_https_apis(
    to_email: str, subject: str, plain_text: str, html_content: str | None = None
) -> tuple[bool, str]:
    """Sends email via modern HTTPS REST APIs over port 443.

    This bypasses cloud hosting firewall restrictions (like Render free-tier
    blocking outbound raw TCP mail ports 25, 465, and 587).
    Supported providers: Brevo (Sendinblue), Resend, SendGrid, and Generic HTTPS Webhook.
    """
    load_dotenv(override=True)
    body_html = html_content or f"<pre>{plain_text}</pre>"

    # 1. Vercel Serverless HTTPS Mail Bridge (port 443 over HTTPS, forwards via port 587)
    try:
        bridge_url = os.getenv("MAIL_BRIDGE_URL") or (
            f"{get_frontend_url()}/api/send-email"
            if get_frontend_url() and "vercel.app" in get_frontend_url()
            else "https://medication-reminder-agent-snw7.vercel.app/api/send-email"
        )
        secret = (
            os.getenv("MAIL_BRIDGE_SECRET")
            or "medassist_mail_bridge_secret_key_2026_fixed"
        )
        _, _, smtp_user, smtp_pass = get_smtp_settings()
        payload = json.dumps(
            {
                "to": to_email,
                "subject": subject,
                "text": plain_text,
                "html": body_html,
                "secret": secret,
                "smtp_user": smtp_user,
                "smtp_pass": smtp_pass,
            }
        ).encode("utf-8")
        req = urllib.request.Request(
            bridge_url,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {secret}",
                "User-Agent": "MedAssist-Cloud/1.0",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=14) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                if data.get("success"):
                    return (
                        True,
                        "Delivered via Vercel HTTPS Mail Bridge (port 443)",
                    )
    except Exception as e:
        print(f"[HTTPS EMAIL] Vercel Mail Bridge note: {e}")

    # 2. Brevo API (https://brevo.com - free 300 emails/day to ANY recipient)
    brevo_key = os.getenv("BREVO_API_KEY")
    if brevo_key and brevo_key.strip():
        try:
            _, _, default_user, _ = get_smtp_settings()
            sender_email = (
                os.getenv("BREVO_SENDER_EMAIL")
                or default_user
                or "maheshburra2712@gmail.com"
            )
            payload = json.dumps(
                {
                    "sender": {"name": APP_NAME, "email": sender_email},
                    "to": [{"email": to_email}],
                    "subject": subject,
                    "textContent": plain_text,
                    "htmlContent": body_html,
                }
            ).encode("utf-8")
            req = urllib.request.Request(
                "https://api.brevo.com/v3/smtp/email",
                data=payload,
                headers={
                    "api-key": brevo_key.strip(),
                    "Content-Type": "application/json",
                    "User-Agent": "MedAssist/1.0",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=12) as resp:
                if resp.status in (200, 201, 202):
                    return True, "Delivered via Brevo HTTPS API (port 443)"
        except Exception as e:
            print(f"[HTTPS EMAIL] Brevo error: {e}")

    # 2. Resend API (https://resend.com - modern developer email API)
    resend_key = os.getenv("RESEND_API_KEY")
    if resend_key and resend_key.strip():
        try:
            sender = os.getenv("RESEND_FROM", f"{APP_NAME} <onboarding@resend.dev>")
            payload = json.dumps(
                {
                    "from": sender,
                    "to": [to_email],
                    "subject": subject,
                    "text": plain_text,
                    "html": body_html,
                }
            ).encode("utf-8")
            req = urllib.request.Request(
                "https://api.resend.com/emails",
                data=payload,
                headers={
                    "Authorization": f"Bearer {resend_key.strip()}",
                    "Content-Type": "application/json",
                    "User-Agent": "MedAssist/1.0",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=12) as resp:
                if resp.status in (200, 201):
                    return True, "Delivered via Resend HTTPS API (port 443)"
        except Exception as e:
            print(f"[HTTPS EMAIL] Resend error: {e}")

    # 3. SendGrid API (https://sendgrid.com)
    sendgrid_key = os.getenv("SENDGRID_API_KEY")
    if sendgrid_key and sendgrid_key.strip():
        try:
            _, _, default_user, _ = get_smtp_settings()
            sender_email = (
                os.getenv("SENDGRID_FROM")
                or default_user
                or "maheshburra2712@gmail.com"
            )
            payload = json.dumps(
                {
                    "personalizations": [{"to": [{"email": to_email}]}],
                    "from": {"email": sender_email, "name": APP_NAME},
                    "subject": subject,
                    "content": [
                        {"type": "text/plain", "value": plain_text},
                        {"type": "text/html", "value": body_html},
                    ],
                }
            ).encode("utf-8")
            req = urllib.request.Request(
                "https://api.sendgrid.com/v3/mail/send",
                data=payload,
                headers={
                    "Authorization": f"Bearer {sendgrid_key.strip()}",
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=12) as resp:
                if resp.status in (200, 202):
                    return True, "Delivered via SendGrid HTTPS API (port 443)"
        except Exception as e:
            print(f"[HTTPS EMAIL] SendGrid error: {e}")

    # 4. Generic Custom Email Webhook (e.g. Zapier, Make, n8n, Cloudflare Worker)
    email_webhook = os.getenv("EMAIL_WEBHOOK_URL")
    if email_webhook and email_webhook.strip():
        try:
            payload = json.dumps(
                {
                    "to": to_email,
                    "subject": subject,
                    "text": plain_text,
                    "html": body_html,
                }
            ).encode("utf-8")
            req = urllib.request.Request(
                email_webhook.strip(),
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=12) as resp:
                if resp.status in (200, 201, 202, 204):
                    return True, "Delivered via HTTPS Email Webhook (port 443)"
        except Exception as e:
            print(f"[HTTPS EMAIL] Webhook error: {e}")

    return False, "No active HTTPS email provider responded"


def dispatch_email(
    recipient_email: str,
    subject: str,
    plain_text: str,
    html_content: str | None = None,
) -> tuple[bool, str]:
    """Universal email dispatcher.

    Tries modern HTTPS REST mailers over port 443 first (bypassing cloud hosting firewall blocks),
    and falls back to dual-port SMTP (587 STARTTLS / 465 SSL) for local/VM environments.
    """
    if not recipient_email or not is_deliverable_email(recipient_email):
        return False, f"Invalid or undeliverable email address: {recipient_email}"

    # Step 1: Attempt HTTPS delivery (works everywhere, including Render free tier)
    https_ok, https_reason = send_email_via_https_apis(
        recipient_email, subject, plain_text, html_content
    )
    if https_ok:
        return True, https_reason

    # Step 2: Fallback to direct SMTP (works locally, VPS, or Render paid tier)
    if is_smtp_configured():
        host, port, user, password = get_smtp_settings()
        try:
            message = EmailMessage()
            message["From"] = f"{APP_NAME} <{user}>"
            message["To"] = recipient_email
            message["Reply-To"] = user
            message["Subject"] = subject
            message.set_content(plain_text)
            if html_content:
                message.add_alternative(html_content, subtype="html")

            smtp_ok, smtp_reason = send_email_via_smtp(
                message, host, port, user, password
            )
            if smtp_ok:
                return True, smtp_reason
            return False, f"{https_reason} | SMTP fallback: {smtp_reason}"
        except Exception as e:
            return False, f"{https_reason} | SMTP exception: {e}"

    return False, f"{https_reason} | SMTP not configured"


def send_email_via_smtp(
    message: EmailMessage, host: str, port: int, user: str, password: str
) -> tuple[bool, str]:
    """Sends email via STARTTLS on port 587, and falls back to SSL on port 465 if needed."""
    logs = []

    # Attempt 1: Port 587 (or configured port) STARTTLS
    try:
        with smtplib.SMTP(host, port or 587, timeout=12) as server:
            server.starttls()
            server.login(user, password)
            server.send_message(message)
        return True, f"Delivered via STARTTLS ({host}:{port})"
    except Exception as e:
        logs.append(f"STARTTLS ({port}) error: {e}")

    # Attempt 2: Port 465 SSL fallback (cloud environments often allow 465 when 587 is firewalled)
    try:
        with smtplib.SMTP_SSL(host, 465, timeout=12) as server:
            server.login(user, password)
            server.send_message(message)
        return True, "Delivered via SSL port 465"
    except Exception as e:
        logs.append(f"SSL (465) error: {e}")

    return False, " | ".join(logs)


def send_reminder_email(
    recipient_email: str,
    medicine_name: str,
    dosage: str,
    reminder_time: str,
    frequency: str,
):
    if not is_deliverable_email(recipient_email):
        return False

    subject = f"💊 Medication Reminder - {medicine_name}"
    plain_text = f"""Medication Reminder

Medicine: {medicine_name}
Dosage: {dosage}
Reminder Time: {reminder_time}
Frequency: {frequency}

Please take your medication on time.

{APP_NAME}
"""
    html_content = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0; text-align: center;">
    <div style="font-size: 36px; margin-bottom: 12px;">💊</div>
    <h2 style="color: #1e293b; margin: 0 0 16px 0;">Medication Reminder</h2>
    <p style="color: #475569; font-size: 15px; margin: 0 0 16px 0;">
      It is time to take your medication:
    </p>
    <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; text-align: left; margin-bottom: 20px;">
      <p style="margin: 4px 0;"><strong>Medicine:</strong> {medicine_name}</p>
      <p style="margin: 4px 0;"><strong>Dosage:</strong> {dosage}</p>
      <p style="margin: 4px 0;"><strong>Time:</strong> {reminder_time}</p>
      <p style="margin: 4px 0;"><strong>Frequency:</strong> {frequency}</p>
    </div>
    <p style="color: #64748b; font-size: 13px;">Please take your medication on time.</p>
  </div>
</body>
</html>
"""
    ok, reason = dispatch_email(recipient_email, subject, plain_text, html_content)
    if ok:
        print(f"[EMAIL] Reminder email sent to {recipient_email} ({reason})")
        send_webhook_message(
            f"Medication Reminder - {medicine_name} ({dosage}) at {reminder_time}"
        )
        return True
    else:
        print(f"Email notification error: {reason}")
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

    # Default to production live Vercel URL so links in emails work globally for all users
    return "https://medication-reminder-agent-snw7.vercel.app"


def send_welcome_email(recipient_email: str, username: str) -> bool:
    """Send welcome email when any new user registers an account."""
    if not is_deliverable_email(recipient_email):
        return False

    frontend_url = get_frontend_url()
    subject = f"Welcome to {APP_NAME}!"
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
    ok, reason = dispatch_email(recipient_email, subject, plain_text, html_content)
    if ok:
        print(
            f"[EMAIL] Welcome email sent successfully to {recipient_email} ({reason})"
        )
        return True
    else:
        print(
            f"[EMAIL ERROR] Failed to send welcome email to {recipient_email}: {reason}"
        )
        return False


def send_password_reset_email_detailed(
    recipient_email: str, token: str
) -> tuple[bool, str]:
    """Send a 1-click password reset link directly to the user's email inbox."""
    if not is_deliverable_email(recipient_email):
        return False, f"Invalid email format: {recipient_email}"

    frontend_url = get_frontend_url()
    reset_link = f"{frontend_url}/reset-password?token={token}"

    subject = f"Reset Your Password - {APP_NAME}"
    plain_text = f"""Hello,

You recently requested to reset the password for your {APP_NAME} account ({recipient_email}).

Click the link below to set a new password:
{reset_link}

This link is valid for 24 hours. If you did not request a password reset, you can safely ignore this email.

Best regards,
{APP_NAME} Support
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
    <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">
      This link expires in 24 hours. If you did not request this, please ignore this email.
    </p>
  </div>
</body>
</html>
"""
    return dispatch_email(recipient_email, subject, plain_text, html_content)


def send_password_reset_email(recipient_email: str, token: str) -> bool:
    """Send a 1-click password reset link directly to the user's email inbox."""
    ok, _ = send_password_reset_email_detailed(recipient_email, token)
    return ok
