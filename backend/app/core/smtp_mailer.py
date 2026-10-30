import logging
from email.message import EmailMessage
import aiosmtplib
from app.core.config import settings

logger = logging.getLogger("voltmate.mailer")

HTML_OTP_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>VoltMate Security Code</title>
  <style>
    body {{
      margin: 0;
      padding: 0;
      background-color: #06090E;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #E2E8F0;
    }}
    .container {{
      max-width: 520px;
      margin: 32px auto;
      background: #0F1622;
      border: 1px solid rgba(0, 245, 155, 0.25);
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 245, 155, 0.15);
    }}
    .logo-container {{
      text-align: center;
      margin-bottom: 24px;
    }}
    .logo-text {{
      font-size: 26px;
      font-weight: 800;
      color: #FFFFFF;
      letter-spacing: -0.5px;
    }}
    .logo-spark {{
      color: #00F59B;
      text-shadow: 0 0 12px rgba(0, 245, 155, 0.6);
    }}
    .badge {{
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      background: rgba(0, 245, 155, 0.1);
      border: 1px solid rgba(0, 245, 155, 0.3);
      color: #00F59B;
      font-size: 12px;
      font-weight: 600;
      margin-top: 6px;
    }}
    h1 {{
      font-size: 20px;
      font-weight: 700;
      color: #FFFFFF;
      margin-top: 16px;
      text-align: center;
    }}
    p {{
      color: #94A3B8;
      font-size: 14px;
      line-height: 1.6;
      text-align: center;
    }}
    .otp-box {{
      margin: 28px 0;
      padding: 20px;
      background: rgba(6, 9, 14, 0.8);
      border: 1px dashed #00F59B;
      border-radius: 12px;
      text-align: center;
    }}
    .otp-code {{
      font-family: 'Courier New', Courier, monospace;
      font-size: 38px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #00F59B;
      text-shadow: 0 0 16px rgba(0, 245, 155, 0.5);
    }}
    .footer {{
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      text-align: center;
      font-size: 12px;
      color: #64748B;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="logo-container">
      <div class="logo-text">Volt<span class="logo-spark">Mate</span></div>
      <div class="badge">Share the Spark • Power the Journey</div>
    </div>
    <h1>Verify Your Spark Identity</h1>
    <p>Use the one-time verification passcode below to secure your session. This code is active for <strong>5 minutes</strong>.</p>
    
    <div class="otp-box">
      <div class="otp-code">{otp}</div>
    </div>

    <p style="font-size: 13px;">Never share your passcode with anyone, including VoltMate hosts or apartment security guards.</p>

    <div class="footer">
      India's P2P Community EV Charging Network • ₹0 Cost Open Infrastructure<br/>
      If you did not request this OTP, you can safely ignore this email.
    </div>
  </div>
</body>
</html>
"""

async def send_otp_email(recipient_email: str, otp_code: str) -> bool:
    """Dispatches a styled HTML OTP email via SMTP with fallback logger."""
    message = EmailMessage()
    message["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    message["To"] = recipient_email
    message["Subject"] = f"⚡ {otp_code} is your VoltMate verification code"

    plain_content = f"Your VoltMate verification code is {otp_code}. Valid for 5 minutes. Do not share this with anyone."
    html_content = HTML_OTP_TEMPLATE.format(otp=otp_code)

    message.set_content(plain_content)
    message.add_alternative(html_content, subtype="html")

    try:
        smtp_pwd = (settings.SMTP_PASSWORD or "").replace(" ", "").strip()
        if not smtp_pwd or smtp_pwd == "dummy_app_password":
            logger.info(f"📧 [DEV MOCK EMAIL] Dispatched OTP {otp_code} to {recipient_email}")
            return True

        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=smtp_pwd,
            start_tls=True,
            timeout=15,
        )
        logger.info(f"Successfully sent OTP email to {recipient_email}")
        return True
    except Exception as e:
        logger.warning(f"SMTP dispatch failed ({str(e)}). Logging OTP for testing: {otp_code}")
        return False

