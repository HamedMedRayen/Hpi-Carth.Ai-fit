import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from core.config import settings

def send_otp_email(to_email: str, otp: str):
    """Sends an OTP code via email. Logs to console if SMTP is not configured."""
    subject = f"{otp} is your Hpi code"
    body = f"""
    <html>
    <body style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2>Hpi Authentication</h2>
        <p>Use the code below to log in to your account:</p>
        <div style="font-size: 32px; font-weight: bold; color: #4A7C59; padding: 20px 0;">
            {otp}
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
    </body>
    </html>
    """

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print(f"\n[EMAIL DUMMY] To: {to_email} | Subject: {subject} | Code: {otp}\n")
        return True

    try:
        msg = MIMEMultipart()
        msg['From'] = settings.EMAIL_FROM
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'html'))

        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
        return False
