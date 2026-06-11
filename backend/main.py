from fastapi import FastAPI, HTTPException, Request, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel
from typing import Optional, List
import random
import time
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import urllib.request
import urllib.error
import json
import secrets
import hashlib
import datetime
import asyncio
from sqlalchemy.orm import Session
from database import SessionLocal, Contact, Registration, PageView, AdminLogin, AccountOpening, Webinar, Feedback, AdminUser, SystemSetting
from user_agents import parse

app = FastAPI(title="SCSL Portal API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class ContactLead(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    message: Optional[str] = None

class WebinarRegistration(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    webinar_id: int
    topic: str
    date: str
    otp: str
    payment_utr: Optional[str] = ""  # UTR/transaction ref for paid webinars

class OTPRequest(BaseModel):
    email: str

class DeleteRequest(BaseModel):
    type: str  # "contact" or "registration" or "account"
    id: int

class PageViewReq(BaseModel):
    page_url: str

class LoginReq(BaseModel):
    username: str
    status: str

class AccountOpeningReq(BaseModel):
    name: str
    email: str
    phone: str
    pan: str
    aadhaar: str
    dob: str
    state: str

class FeedbackReq(BaseModel):
    name: str
    email: str
    rating: int
    comment: str

class ToggleFeedbackReq(BaseModel):
    id: int
    is_approved: bool

# ─── OTP Store (in-memory, email -> {otp, timestamp}) ────
otp_store = {}
OTP_EXPIRY_SECONDS = 600  # 10 minutes

# ─── SMTP & Brevo Helper Configuration ───────────────────
security = HTTPBasic()
last_otp_error = "None"

def get_setting(db: Session, key: str, default: str = "") -> str:
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if setting and setting.value:
        return setting.value
    # Fallback to environment variables or defaults
    if key == "brevo_api_key":
        return os.environ.get("BREVO_API_KEY", "").strip()
    elif key == "smtp_email":
        return os.environ.get("SMTP_EMAIL", "steelcityscslportal@gmail.com")
    elif key == "smtp_password":
        return os.environ.get("SMTP_PASSWORD", "nwgg kbty ngbo lcvc")
    elif key == "smtp_host":
        return os.environ.get("SMTP_HOST", "smtp.gmail.com")
    elif key == "smtp_port":
        return os.environ.get("SMTP_PORT", "587")
    return default

def send_email_helper(to_email: str, subject: str, html_content: str, db: Session) -> bool:
    global last_otp_error
    brevo_api_key = get_setting(db, "brevo_api_key")
    smtp_email = get_setting(db, "smtp_email")
    smtp_password = get_setting(db, "smtp_password")
    smtp_host = get_setting(db, "smtp_host")
    smtp_port = int(get_setting(db, "smtp_port"))
    
    if brevo_api_key:
        url = "https://api.brevo.com/v3/smtp/email"
        headers = {
            "api-key": brevo_api_key,
            "content-type": "application/json",
            "accept": "application/json"
        }
        payload = {
            "sender": {"name": "Steel City Securities", "email": smtp_email},
            "to": [{"email": to_email}],
            "subject": subject,
            "htmlContent": html_content
        }
        try:
            req = urllib.request.Request(
                url, 
                data=json.dumps(payload).encode("utf-8"), 
                headers=headers, 
                method="POST"
            )
            with urllib.request.urlopen(req) as response:
                res_body = response.read().decode("utf-8")
                print(f"[EMAIL SERVICE] Email sent successfully to {to_email} via Brevo API: {res_body}")
                return True
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8")
            msg = f"HTTP Error {e.code}: {error_body}"
            print(f"[EMAIL SERVICE] Failed to send via Brevo API: {msg}")
            last_otp_error = msg
        except Exception as e:
            msg = f"Error: {e}"
            print(f"[EMAIL SERVICE] Failed to send via Brevo API: {msg}")
            last_otp_error = msg
            
    if not smtp_password:
        print(f"[EMAIL SERVICE] SMTP not configured. Email to {to_email} not sent.")
        return False
        
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"Steel City Securities <{smtp_email}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_content, "html"))

        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_email, smtp_password)
            server.sendmail(smtp_email, to_email, msg.as_string())
        
        print(f"[EMAIL SERVICE] Email sent successfully to {to_email} via SMTP")
        return True
    except Exception as e:
        msg = f"Error: {e}"
        print(f"[EMAIL SERVICE] Failed to send email via SMTP: {msg}")
        last_otp_error = msg
        return False

# ─── Specific Notification Mail Templates ─────────────────
def send_otp_email(to_email: str, otp_code: str, db: Session = Depends(get_db)):
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: #f8f9fa; border-radius: 12px; padding: 30px; border: 1px solid #e0e0e0;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #0a1628; margin: 0;">Steel City Securities</h2>
                <p style="color: #666; font-size: 14px;">Webinar Registration Verification</p>
            </div>
            <div style="background: white; border-radius: 8px; padding: 24px; text-align: center; margin: 20px 0;">
                <p style="color: #333; font-size: 14px; margin: 0 0 12px 0;">Your One-Time Password is:</p>
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0a1628; padding: 12px; background: #e8f0fe; border-radius: 8px;">
                    {otp_code}
                </div>
            </div>
            <p style="color: #888; font-size: 12px; text-align: center;">This OTP is valid for 10 minutes. Do not share it with anyone.</p>
        </div>
    </body>
    </html>
    """
    return send_email_helper(to_email, "Your SCSL Webinar Registration OTP", html, db)

def send_registration_confirmation_email(to_email: str, to_name: str, topic: str, date: str, time_str: str, link: str, db: Session):
    join_section = f"""
    <div style="text-align: center; margin: 30px 0 20px 0;">
        <a href="{link}" target="_blank" style="background: #0077B6; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px rgba(0,119,182,0.25);">
            Join Live Meeting
        </a>
        <p style="margin: 12px 0 0 0; font-size: 12px; color: #666; word-break: break-all;">
            Or copy-paste this URL: <br/>
            <a href="{link}" style="color: #0077B6;">{link}</a>
        </p>
    </div>
    """ if link else """
    <div style="background: #fff9db; border-radius: 8px; padding: 12px; border: 1px solid #ffe3e3; margin: 20px 0; font-size: 13px; color: #b07a00; text-align: center;">
        ⚠️ The meeting link will be sent to you prior to the session start.
    </div>
    """
    
    html = f"""
    <html>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333;">
        <div style="max-width: 550px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
            <div style="background: #0a1628; padding: 30px; text-align: center; border-bottom: 4px solid #0077B6;">
                <img src="https://www.steelcitynettrade.com/images/Steelcity-logo.png" alt="Steel City Logo" style="height: 40px; margin-bottom: 12px;" />
                <h2 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600; letter-spacing: 0.5px;">Registration Confirmed!</h2>
            </div>
            <div style="padding: 30px;">
                <p style="font-size: 16px; margin: 0 0 16px 0; color: #0a1628;">Dear <strong>{to_name}</strong>,</p>
                <p style="font-size: 14px; line-height: 1.6; margin: 0 0 24px 0; color: #555;">
                    Thank you for registering! Your seat has been reserved for our live investor awareness session. Below are your meeting details:
                </p>
                
                <div style="background: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
                    <h4 style="color: #0a1628; margin: 0 0 12px 0; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">{topic}</h4>
                    <p style="margin: 6px 0; font-size: 13px; color: #555;">📅 <strong>Date:</strong> {date}</p>
                    <p style="margin: 6px 0; font-size: 13px; color: #555;">⏰ <strong>Time:</strong> {time_str}</p>
                    <p style="margin: 6px 0; font-size: 13px; color: #555;">💻 <strong>Mode:</strong> Online</p>
                </div>
                
                {join_section}
                
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                
                <p style="font-size: 12px; line-height: 1.5; color: #888; margin: 0; text-align: center;">
                    If you have questions, contact us at <a href="mailto:scsl@steelcitynettrade.com" style="color: #0077B6; text-decoration: none;">scsl@steelcitynettrade.com</a>.
                </p>
            </div>
            <div style="background: #f8fafc; padding: 15px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                © 2026 Steel City Securities Limited. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    """
    return send_email_helper(to_email, f"Webinar Registration Confirmed: {topic}", html, db)

def send_feedback_confirmation_email(to_email: str, name: str, db: Session):
    html = f"""
    <html>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333;">
        <div style="max-width: 550px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
            <div style="background: #0a1628; padding: 30px; text-align: center; border-bottom: 4px solid #10b981;">
                <img src="https://www.steelcitynettrade.com/images/Steelcity-logo.png" alt="Steel City Logo" style="height: 40px; margin-bottom: 12px;" />
                <h2 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">Thank You for Your Feedback!</h2>
            </div>
            <div style="padding: 30px;">
                <p style="font-size: 16px; margin: 0 0 16px 0; color: #0a1628;">Dear <strong>{name}</strong>,</p>
                <p style="font-size: 14px; line-height: 1.6; margin: 0 0 20px 0; color: #555;">
                    We sincerely appreciate you taking the time to share your feedback with us. Your insights and suggestions help us continually improve our platforms and services.
                </p>
                <p style="font-size: 14px; line-height: 1.6; margin: 0 0 24px 0; color: #555;">
                    At Steel City Securities, we are committed to providing a transparent, secure, and premium wealth-creation experience for all our investors. We are delighted to have you as part of our community.
                </p>
                <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; border: 1px solid #bbf7d0; text-align: center; font-weight: 600; color: #16a34a;">
                    🌟 "Your trust is our greatest asset."
                </div>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="font-size: 12px; line-height: 1.5; color: #888; margin: 0; text-align: center;">
                    If you have any further questions or suggestions, please contact our support team at <a href="mailto:scsl@steelcitynettrade.com" style="color: #0077B6; text-decoration: none;">scsl@steelcitynettrade.com</a>.
                </p>
            </div>
            <div style="background: #f8fafc; padding: 15px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                © 2026 Steel City Securities Limited. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    """
    send_email_helper(to_email, "Thank You for Your Feedback - Steel City Securities", html, db)

def send_account_opening_confirmation_email(to_email: str, name: str, pan: str, db: Session):
    html = f"""
    <html>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333;">
        <div style="max-width: 550px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
            <div style="background: #0a1628; padding: 30px; text-align: center; border-bottom: 4px solid #0077B6;">
                <img src="https://www.steelcitynettrade.com/images/Steelcity-logo.png" alt="Steel City Logo" style="height: 40px; margin-bottom: 12px;" />
                <h2 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">Application Received!</h2>
            </div>
            <div style="padding: 30px;">
                <p style="font-size: 16px; margin: 0 0 16px 0; color: #0a1628;">Dear <strong>{name}</strong>,</p>
                <p style="font-size: 14px; line-height: 1.6; margin: 0 0 20px 0; color: #555;">
                    Thank you for submitting your application to open a Demat & Trading account with Steel City Securities Limited. We are excited to welcome you aboard!
                </p>
                <div style="background: #f8fafc; border-radius: 12px; padding: 18px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
                    <p style="margin: 4px 0; font-size: 13px; color: #444;"><strong>Applicant:</strong> {name}</p>
                    <p style="margin: 4px 0; font-size: 13px; color: #444;"><strong>PAN Number:</strong> {pan[:5]}••••{pan[-1] if len(pan) > 5 else ''}</p>
                    <p style="margin: 4px 0; font-size: 13px; color: #444;"><strong>Status:</strong> Under Review 📁</p>
                </div>
                <h4 style="color: #0a1628; margin: 0 0 10px 0; font-size: 15px;">What happens next?</h4>
                <ol style="margin: 0 0 24px 0; padding-left: 20px; font-size: 13px; color: #555; line-height: 1.6;">
                    <li style="margin-bottom: 8px;">Our e-KYC team will verify your Aadhaar and PAN details.</li>
                    <li style="margin-bottom: 8px;">A representative will contact you if any additional documents are required.</li>
                    <li style="margin-bottom: 8px;">Once approved, your demat credentials will be emailed to you instantly.</li>
                </ol>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="font-size: 12px; line-height: 1.5; color: #888; margin: 0; text-align: center;">
                    If you did not initiate this request, please contact our helpline immediately at <a href="mailto:scsl@steelcitynettrade.com" style="color: #0077B6; text-decoration: none;">scsl@steelcitynettrade.com</a>.
                </p>
            </div>
            <div style="background: #f8fafc; padding: 15px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                © 2026 Steel City Securities Limited. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    """
    send_email_helper(to_email, "Account Opening Application Received - Steel City Securities", html, db)

def send_webinar_reminder_email(to_email: str, name: str, topic: str, trainer: str, time_str: str, link: str, db: Session):
    join_section = f"""
    <div style="text-align: center; margin: 30px 0 20px 0;">
        <a href="{link}" target="_blank" style="background: #dc2626; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px rgba(220,38,38,0.25);">
            Join Meeting Now
        </a>
        <p style="margin: 12px 0 0 0; font-size: 12px; color: #666; word-break: break-all;">
            Or join here: <br/>
            <a href="{link}" style="color: #0077B6;">{link}</a>
        </p>
    </div>
    """ if link else """
    <div style="background: #fff9db; border-radius: 8px; padding: 12px; border: 1px solid #ffe3e3; margin: 20px 0; font-size: 13px; color: #b07a00; text-align: center;">
        ⚠️ The meeting link will be shared via our official groups shortly. Please check your messages.
    </div>
    """
    
    html = f"""
    <html>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333;">
        <div style="max-width: 550px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
            <div style="background: #991b1b; padding: 30px; text-align: center; border-bottom: 4px solid #dc2626;">
                <img src="https://www.steelcitynettrade.com/images/Steelcity-logo.png" alt="Steel City Logo" style="height: 40px; margin-bottom: 12px;" />
                <h2 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">Webinar Starts in 1 Hour! ⏰</h2>
            </div>
            <div style="padding: 30px;">
                <p style="font-size: 16px; margin: 0 0 16px 0; color: #0a1628;">Dear <strong>{name}</strong>,</p>
                <p style="font-size: 14px; line-height: 1.6; margin: 0 0 20px 0; color: #555;">
                    This is a reminder that the live webinar you registered for is starting in exactly one hour. Please make sure you are prepared.
                </p>
                
                <div style="background: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
                    <h4 style="color: #0a1628; margin: 0 0 12px 0; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">{topic}</h4>
                    <p style="margin: 6px 0; font-size: 13px; color: #555;">👨‍🏫 <strong>Trainer:</strong> {trainer}</p>
                    <p style="margin: 6px 0; font-size: 13px; color: #555;">⏰ <strong>Schedule:</strong> {time_str}</p>
                </div>
                
                {join_section}
                
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="font-size: 12px; line-height: 1.5; color: #888; margin: 0; text-align: center;">
                    If you have questions, contact us at <a href="mailto:scsl@steelcitynettrade.com" style="color: #0077B6; text-decoration: none;">scsl@steelcitynettrade.com</a>.
                </p>
            </div>
            <div style="background: #f8fafc; padding: 15px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                © 2026 Steel City Securities Limited. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    """
    return send_email_helper(to_email, f"Reminder: Webinar starts in 1 hour - {topic}", html, db)

# ─── Database-backed Admin Authentication ─────────────────
def authenticate_admin(request: Request, credentials: HTTPBasicCredentials = Depends(security), db: Session = Depends(get_db)) -> AdminUser:
    pwd_hash = hashlib.sha256(credentials.password.encode()).hexdigest()
    user = db.query(AdminUser).filter(AdminUser.username == credentials.username).first()
    
    is_valid = user is not None and secrets.compare_digest(user.password_hash, pwd_hash)
    status = "SUCCESS" if is_valid else "FAILED"
    ip = request.client.host
    
    # Save the login attempt to the database for audit logs
    login_log = AdminLogin(username=credentials.username, ip_address=ip, status=status)
    db.add(login_log)
    db.commit()
    
    if not is_valid:
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return user

def require_super_admin(current_user: AdminUser = Depends(authenticate_admin)) -> AdminUser:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Forbidden: This section requires super-admin permissions"
        )
    return current_user

def generate_otp():
    """Generate a unique 6-digit OTP"""
    return str(random.randint(100000, 999999))

# ─── Default Webinar Seed Data ──────────────────────
DEFAULT_WEBINARS = [
    {"trainer": "Avadhut Sathe",   "region": "Pan India",    "date": "30 May",  "day": "Thursday", "time": "English | 6:00 PM – 9:00 PM",             "topic": "Secrets of Smart Investing",         "mode": "Online", "seats": 250, "link": "", "avatar_url": "/host2.png"},
    {"trainer": "Rajesh Kutty",    "region": "Middle East",  "date": "30 May",  "day": "Thursday", "time": "English | 10:30 AM UAE Time (Gulf Time)",  "topic": "F&O Masterclass",                      "mode": "Online", "seats": 200, "link": "", "avatar_url": "/host2.png"},
    {"trainer": "Avadhut Sathe",   "region": "Pan India",    "date": "31 May",  "day": "Friday",   "time": "Hindi | 6:00 PM – 9:00 PM",               "topic": "Understanding Commodity Markets",     "mode": "Online", "seats": 300, "link": "", "avatar_url": "/host2.png"},
    {"trainer": "Vigneshwar DL",   "region": "Pan India",    "date": "31 May",  "day": "Friday",   "time": "Tamil | 6:00 PM – 9:00 PM",               "topic": "Sub-Broker Success Blueprint",        "mode": "Online", "seats": 150, "link": "", "avatar_url": "/host2.png"},
]

def seed_webinars():
    """Populate the webinars table with defaults if it is empty."""
    db = SessionLocal()
    try:
        if db.query(Webinar).count() == 0:
            for w in DEFAULT_WEBINARS:
                db.add(Webinar(**w))
            db.commit()
            print("[SEED] Seeded default webinars.")
    finally:
        db.close()

seed_webinars()

# ─── Base market data with realistic simulation ───
BASE_DATA = {
    "NIFTY 50":   {"price": 22450.75, "lot": 50},
    "SENSEX":     {"price": 73850.40, "lot": 1},
    "BANK NIFTY": {"price": 48312.60, "lot": 15},
    "SCSL":       {"price": 450.25,   "lot": 1},
    "USD/INR":    {"price": 83.15,    "lot": 1},
    "GOLD MCX":   {"price": 71240.00, "lot": 1},
    "CRUDE OIL":  {"price": 6512.00,  "lot": 100},
    "USD/JPY":    {"price": 157.42,   "lot": 1},
}

def simulate_price(base: float) -> dict:
    volatility = base * 0.005  
    change = round(random.uniform(-volatility, volatility), 2)
    new_price = round(base + change, 2)
    pct = round((change / base) * 100, 2)
    sign = "+" if change >= 0 else ""
    return {
        "price": new_price,
        "change": f"{sign}{change}",
        "percent": f"{sign}{pct}%",
        "up": change >= 0,
    }

@app.get("/")
async def root():
    return {"message": "Steel City Securities Limited Portal API", "status": "online"}

# ─── Webinar Public Endpoints ─────────────────────────
@app.get("/api/webinars")
async def get_webinars(db: Session = Depends(get_db)):
    webinars = db.query(Webinar).order_by(Webinar.id.asc()).all()
    result = []
    for w in webinars:
        reg_count = db.query(Registration).filter(Registration.webinar_id == w.id).count()
        result.append({
            "id": w.id,
            "trainer": w.trainer,
            "region": w.region,
            "date": w.date,
            "day": w.day,
            "time": w.time,
            "topic": w.topic,
            "mode": w.mode,
            "seats": w.seats,
            "link": w.link,
            "avatar_url": w.avatar_url,
            "registration_count": reg_count,
            "is_paid": w.is_paid or False,
            "fee_amount": w.fee_amount or 0.0,
            "payment_utr_required": w.payment_utr_required if w.payment_utr_required is not None else True,
        })
    return result

class WebinarSaveReq(BaseModel):
    id: Optional[int] = None
    trainer: str
    region: str
    date: str
    day: str
    time: str
    topic: str
    mode: str = "Online"
    seats: int = 200
    link: str = ""
    avatar_url: str = "/host2.png"
    is_paid: bool = False
    fee_amount: float = 0.0
    payment_utr_required: bool = True

@app.post("/api/webinars/save")
async def save_webinar(req: WebinarSaveReq, username: str = Depends(authenticate_admin), db: Session = Depends(get_db)):
    if req.id:
        w = db.query(Webinar).filter(Webinar.id == req.id).first()
        if not w:
            raise HTTPException(status_code=404, detail="Webinar not found")
        w.trainer              = req.trainer
        w.region               = req.region
        w.date                 = req.date
        w.day                  = req.day
        w.time                 = req.time
        w.topic                = req.topic
        w.mode                 = req.mode
        w.seats                = req.seats
        w.link                 = req.link
        w.avatar_url           = req.avatar_url
        w.is_paid              = req.is_paid
        w.fee_amount           = req.fee_amount
        w.payment_utr_required = req.payment_utr_required
    else:
        w = Webinar(
            trainer=req.trainer, region=req.region, date=req.date,
            day=req.day, time=req.time, topic=req.topic, mode=req.mode,
            seats=req.seats, link=req.link, avatar_url=req.avatar_url,
            is_paid=req.is_paid, fee_amount=req.fee_amount,
            payment_utr_required=req.payment_utr_required
        )
        db.add(w)
    db.commit()
    db.refresh(w)
    return {"success": True, "id": w.id}

@app.delete("/api/webinars/{webinar_id}")
async def delete_webinar(webinar_id: int, username: str = Depends(authenticate_admin), db: Session = Depends(get_db)):
    w = db.query(Webinar).filter(Webinar.id == webinar_id).first()
    if w:
        db.delete(w)
        db.commit()
    return {"success": True}

@app.get("/api/market-watch")
async def market_watch():
    result = []
    for symbol, data in BASE_DATA.items():
        sim = simulate_price(data["price"])
        result.append({
            "symbol": symbol,
            "price": f"{sim['price']:,.2f}",
            "change": sim["change"],
            "percent": sim["percent"],
            "up": sim["up"],
        })
    return result

@app.post("/api/track/pageview")
async def track_pageview(req_data: PageViewReq, request: Request, db: Session = Depends(get_db)):
    ip = request.client.host
    user_agent_str = request.headers.get("user-agent", "")
    ua = parse(user_agent_str)
    
    browser = ua.browser.family if ua.browser.family else "Unknown"
    os = ua.os.family if ua.os.family else "Unknown"
    device = "Mobile" if ua.is_mobile else "Tablet" if ua.is_tablet else "PC"
    
    pv = PageView(
        ip_address=ip,
        user_agent=user_agent_str,
        browser=browser,
        os=os,
        device=device,
        page_url=req_data.page_url
    )
    db.add(pv)
    db.commit()
    return {"success": True}

@app.post("/api/track/login")
async def track_login(req_data: LoginReq, request: Request, db: Session = Depends(get_db)):
    ip = request.client.host
    login = AdminLogin(
        username=req_data.username,
        ip_address=ip,
        status=req_data.status
    )
    db.add(login)
    db.commit()
    return {"success": True}

@app.post("/api/contact")
async def submit_contact(lead: ContactLead, db: Session = Depends(get_db)):
    contact = Contact(name=lead.name, email=lead.email, phone=lead.phone, message=lead.message)
    db.add(contact)
    db.commit()
    return {"success": True, "message": f"Thank you {lead.name}! Our team will contact you within 24 hours."}

@app.post("/api/register/request-otp")
async def request_otp(req: OTPRequest, db: Session = Depends(get_db)):
    email = req.email.strip().lower()
    otp_code = generate_otp()
    
    # Store OTP with timestamp
    otp_store[email] = {"otp": otp_code, "timestamp": time.time()}
    
    # Send OTP via email
    sent = send_otp_email(email, otp_code, db)
    
    if sent:
        print(f"[OTP SERVICE] OTP '{otp_code}' generated for {email}")
        return {"success": True, "message": f"OTP sent successfully to {email}"}
    else:
        raise HTTPException(status_code=500, detail="Failed to send OTP email. Please try again.")

@app.post("/api/register")
async def register_webinar(reg: WebinarRegistration, db: Session = Depends(get_db)):
    email = reg.email.strip().lower()
    
    # Check if OTP exists for this email
    if email not in otp_store:
        raise HTTPException(status_code=400, detail="No OTP was requested for this email. Please request an OTP first.")
    
    stored = otp_store[email]
    
    # Check OTP expiry
    if time.time() - stored["timestamp"] > OTP_EXPIRY_SECONDS:
        del otp_store[email]
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
    
    # Verify OTP
    if reg.otp.strip() != stored["otp"]:
        raise HTTPException(status_code=400, detail="Invalid OTP. Please check and try again.")
    
    # OTP verified — remove it so it can't be reused
    del otp_store[email]
    
    # Look up webinar to get payment config
    webinar = db.query(Webinar).filter(Webinar.id == reg.webinar_id).first()
    
    # Determine payment status
    pay_status = "free"
    fee_paid   = 0.0
    if webinar and webinar.is_paid:
        if webinar.payment_utr_required and not (reg.payment_utr or "").strip():
            raise HTTPException(status_code=400, detail="Payment UTR/reference is required for this webinar. Please complete payment and enter your UTR.")
        pay_status = "paid"
        fee_paid   = webinar.fee_amount or 0.0
    
    registration = Registration(
        name=reg.name, email=reg.email, phone=reg.phone, 
        webinar_id=reg.webinar_id, topic=reg.topic, date=reg.date,
        payment_utr=reg.payment_utr or "",
        payment_status=pay_status,
        fee_paid=fee_paid
    )
    db.add(registration)
    db.commit()

    # Send confirmation email (best-effort — don't fail registration if email fails)
    try:
        join_link = webinar.link if webinar and webinar.link else ""
        time_str  = webinar.time if webinar else reg.date
        send_registration_confirmation_email(
            to_email=reg.email,
            to_name=reg.name,
            topic=reg.topic,
            date=reg.date,
            time_str=time_str,
            link=join_link,
            db=db
        )
    except Exception as e:
        print(f"[CONFIRM EMAIL] Failed to send confirmation to {reg.email}: {e}")

    return {"success": True, "message": f"Successfully registered for: {reg.topic}!"}

@app.post("/api/open-account")
async def open_account(req: AccountOpeningReq, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    opening = AccountOpening(
        name=req.name,
        email=req.email,
        phone=req.phone,
        pan=req.pan,
        aadhaar=req.aadhaar,
        dob=req.dob,
        state=req.state
    )
    db.add(opening)
    db.commit()
    # Send welcome email in background (non-blocking)
    background_tasks.add_task(send_account_opening_confirmation_email, req.email, req.name, req.pan, db)
    return {"success": True, "message": "Your account opening request has been submitted successfully!"}

@app.post("/api/feedback")
async def create_feedback(req: FeedbackReq, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    if req.rating < 1 or req.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5.")
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Name cannot be empty.")
    if not req.comment.strip():
        raise HTTPException(status_code=400, detail="Comment cannot be empty.")
    
    feedback = Feedback(
        name=req.name.strip(),
        email=req.email.strip(),
        rating=req.rating,
        comment=req.comment.strip(),
        is_approved=False
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    # Send thank-you email in background (non-blocking)
    if req.email.strip():
        background_tasks.add_task(send_feedback_confirmation_email, req.email.strip(), req.name.strip(), db)
    return {"success": True, "message": "Feedback submitted successfully!", "feedback": {
        "id": feedback.id,
        "name": feedback.name,
        "rating": feedback.rating,
        "comment": feedback.comment,
        "timestamp": feedback.timestamp.isoformat()
    }}


@app.get("/api/feedback")
async def get_feedbacks(db: Session = Depends(get_db)):
    feedbacks = db.query(Feedback).filter(Feedback.is_approved == True).order_by(Feedback.timestamp.desc()).all()
    return feedbacks

@app.post("/api/feedback/approve")
async def approve_feedback(req: ToggleFeedbackReq, username: str = Depends(authenticate_admin), db: Session = Depends(get_db)):
    item = db.query(Feedback).filter(Feedback.id == req.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Feedback not found")
    item.is_approved = req.is_approved
    db.commit()
    return {"success": True, "message": f"Feedback approval status updated to {req.is_approved}."}

@app.get("/api/leads")
async def get_leads(username: str = Depends(authenticate_admin), db: Session = Depends(get_db)):
    contacts = db.query(Contact).order_by(Contact.timestamp.desc()).all()
    registrations = db.query(Registration).order_by(Registration.timestamp.desc()).all()
    page_views = db.query(PageView).order_by(PageView.timestamp.desc()).all()
    logins = db.query(AdminLogin).order_by(AdminLogin.timestamp.desc()).all()
    account_openings = db.query(AccountOpening).order_by(AccountOpening.timestamp.desc()).all()
    feedbacks = db.query(Feedback).order_by(Feedback.timestamp.desc()).all()
    
    return {
        "contacts": contacts,
        "registrations": registrations,
        "page_views": page_views,
        "logins": logins,
        "account_openings": account_openings,
        "feedbacks": feedbacks
    }

@app.delete("/api/leads/delete")
async def delete_lead(req: DeleteRequest, username: str = Depends(authenticate_admin), db: Session = Depends(get_db)):
    if req.type == "contact":
        item = db.query(Contact).filter(Contact.id == req.id).first()
    elif req.type == "registration":
        item = db.query(Registration).filter(Registration.id == req.id).first()
    elif req.type == "account":
        item = db.query(AccountOpening).filter(AccountOpening.id == req.id).first()
    elif req.type == "feedback":
        item = db.query(Feedback).filter(Feedback.id == req.id).first()
    else:
        item = None
        
    if item:
        db.delete(item)
        db.commit()
    return {"success": True, "message": f"Deleted entry from {req.type}."}

@app.get("/api/health")
async def health():
    return {"status": "healthy", "service": "SCSL Portal API"}

@app.get("/api/diag")
async def diag(db: Session = Depends(get_db)):
    from database import DATABASE_URL
    db_type = "postgresql" if "postgres" in DATABASE_URL or "postgresql" in DATABASE_URL else "sqlite"
    brevo_key = get_setting(db, "brevo_api_key")
    smtp_email = get_setting(db, "smtp_email")
    return {
        "has_brevo_key": bool(brevo_key),
        "brevo_key_len": len(brevo_key) if brevo_key else 0,
        "sender_email": smtp_email,
        "last_otp_error": last_otp_error,
        "db_type": db_type
    }

# ─── Admin User Management Routes ─────────────────
class AdminUserCreateReq(BaseModel):
    username: str
    password: str
    role: str = "supervisor"  # "admin" or "supervisor"

class AdminUserUpdateReq(BaseModel):
    id: int
    username: str
    password: Optional[str] = None
    role: str = "supervisor"

@app.get("/api/admin/users")
async def get_admin_users(current_user: AdminUser = Depends(require_super_admin), db: Session = Depends(get_db)):
    users = db.query(AdminUser).order_by(AdminUser.created_at.asc()).all()
    return [{"id": u.id, "username": u.username, "role": u.role, "created_at": u.created_at.isoformat()} for u in users]

@app.post("/api/admin/users")
async def create_admin_user(req: AdminUserCreateReq, current_user: AdminUser = Depends(require_super_admin), db: Session = Depends(get_db)):
    existing = db.query(AdminUser).filter(AdminUser.username == req.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists.")
    pwd_hash = hashlib.sha256(req.password.encode()).hexdigest()
    new_user = AdminUser(username=req.username, password_hash=pwd_hash, role=req.role)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"success": True, "id": new_user.id, "username": new_user.username, "role": new_user.role}

@app.put("/api/admin/users")
async def update_admin_user(req: AdminUserUpdateReq, current_user: AdminUser = Depends(require_super_admin), db: Session = Depends(get_db)):
    user = db.query(AdminUser).filter(AdminUser.id == req.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    # Check username uniqueness (excluding self)
    existing = db.query(AdminUser).filter(AdminUser.username == req.username, AdminUser.id != req.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken by another user.")
    user.username = req.username
    user.role = req.role
    if req.password:
        user.password_hash = hashlib.sha256(req.password.encode()).hexdigest()
    db.commit()
    return {"success": True}

@app.delete("/api/admin/users/{user_id}")
async def delete_admin_user(user_id: int, current_user: AdminUser = Depends(require_super_admin), db: Session = Depends(get_db)):
    user = db.query(AdminUser).filter(AdminUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account.")
    db.delete(user)
    db.commit()
    return {"success": True}

# ─── System Settings Routes ─────────────────────────
class SettingUpdateReq(BaseModel):
    key: str
    value: str

SETTING_KEYS = [
    {"key": "brevo_api_key",   "label": "Brevo API Key",       "type": "password", "hint": "From Brevo dashboard → API Keys"},
    {"key": "smtp_email",      "label": "SMTP / Sender Email",  "type": "text",     "hint": "Gmail or Brevo sender email"},
    {"key": "smtp_password",   "label": "SMTP App Password",   "type": "password", "hint": "Gmail app password (16 chars)"},
    {"key": "smtp_host",       "label": "SMTP Host",            "type": "text",     "hint": "smtp.gmail.com or smtp-relay.brevo.com"},
    {"key": "smtp_port",       "label": "SMTP Port",            "type": "text",     "hint": "587 (TLS) or 465 (SSL)"},
]

@app.get("/api/admin/settings")
async def get_settings(current_user: AdminUser = Depends(require_super_admin), db: Session = Depends(get_db)):
    result = []
    for meta in SETTING_KEYS:
        setting = db.query(SystemSetting).filter(SystemSetting.key == meta["key"]).first()
        value = setting.value if setting else ""
        result.append({"key": meta["key"], "label": meta["label"], "type": meta["type"], "hint": meta["hint"], "value": value})
    return result

@app.post("/api/admin/settings")
async def update_setting(req: SettingUpdateReq, current_user: AdminUser = Depends(require_super_admin), db: Session = Depends(get_db)):
    setting = db.query(SystemSetting).filter(SystemSetting.key == req.key).first()
    if setting:
        setting.value = req.value
    else:
        setting = SystemSetting(key=req.key, value=req.value)
        db.add(setting)
    db.commit()
    return {"success": True}

# ─── CSV Export Routes ──────────────────────────────
import csv, io
from fastapi.responses import StreamingResponse

def make_csv_response(filename: str, headers: list, rows: list) -> StreamingResponse:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    writer.writerows(rows)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.get("/api/export/contacts")
async def export_contacts(current_user: AdminUser = Depends(authenticate_admin), db: Session = Depends(get_db)):
    contacts = db.query(Contact).order_by(Contact.timestamp.desc()).all()
    rows = [[c.id, c.name, c.email, c.phone or '', c.message or '', c.timestamp.strftime('%Y-%m-%d %H:%M:%S')] for c in contacts]
    return make_csv_response("contacts.csv", ["ID","Name","Email","Phone","Message","Submitted At"], rows)

@app.get("/api/export/registrations")
async def export_registrations(current_user: AdminUser = Depends(authenticate_admin), db: Session = Depends(get_db)):
    regs = db.query(Registration).order_by(Registration.timestamp.desc()).all()
    rows = [[r.id, r.name, r.email, r.phone or '', r.topic, r.date, r.payment_status or 'free', r.fee_paid or 0, r.payment_utr or '', r.timestamp.strftime('%Y-%m-%d %H:%M:%S')] for r in regs]
    return make_csv_response("registrations.csv", ["ID","Name","Email","Phone","Topic","Date","Payment Status","Fee Paid","UTR","Registered At"], rows)

@app.get("/api/export/accounts")
async def export_accounts(current_user: AdminUser = Depends(authenticate_admin), db: Session = Depends(get_db)):
    accounts = db.query(AccountOpening).order_by(AccountOpening.timestamp.desc()).all()
    rows = [[a.id, a.name, a.email, a.phone, a.pan, a.aadhaar, a.dob, a.state, a.timestamp.strftime('%Y-%m-%d %H:%M:%S')] for a in accounts]
    return make_csv_response("account_openings.csv", ["ID","Name","Email","Phone","PAN","Aadhaar","DOB","State","Applied At"], rows)

@app.get("/api/export/feedbacks")
async def export_feedbacks(current_user: AdminUser = Depends(authenticate_admin), db: Session = Depends(get_db)):
    feedbacks = db.query(Feedback).order_by(Feedback.timestamp.desc()).all()
    rows = [[f.id, f.name, f.email, f.rating, f.comment, 'Yes' if f.is_approved else 'No', f.timestamp.strftime('%Y-%m-%d %H:%M:%S')] for f in feedbacks]
    return make_csv_response("feedbacks.csv", ["ID","Name","Email","Rating","Comment","Published","Submitted At"], rows)

# ─── Webinar 1-Hour Reminder Daemon ────────────────
reminder_task_running = False

async def webinar_reminder_daemon():
    """Background async task: checks every 5 minutes for webinars starting in ~1 hour and sends reminder emails."""
    global reminder_task_running
    reminder_task_running = True
    print("[REMINDER DAEMON] Started webinar reminder daemon.")
    while True:
        try:
            await asyncio.sleep(300)  # check every 5 minutes
            db = SessionLocal()
            try:
                now = datetime.datetime.utcnow()
                one_hour_later = now + datetime.timedelta(hours=1)
                window_start   = one_hour_later - datetime.timedelta(minutes=5)
                window_end     = one_hour_later + datetime.timedelta(minutes=5)
                webinars = db.query(Webinar).filter(
                    Webinar.start_time >= window_start,
                    Webinar.start_time <= window_end
                ).all()
                for webinar in webinars:
                    registrations = db.query(Registration).filter(
                        Registration.webinar_id == webinar.id,
                        Registration.reminder_sent == False
                    ).all()
                    for reg in registrations:
                        try:
                            send_webinar_reminder_email(
                                to_email=reg.email,
                                name=reg.name,
                                topic=webinar.topic,
                                trainer=webinar.trainer,
                                time_str=webinar.time,
                                link=webinar.link or "",
                                db=db
                            )
                            reg.reminder_sent = True
                            reg.reminder_sent_at = datetime.datetime.utcnow()
                        except Exception as e:
                            print(f"[REMINDER DAEMON] Failed to send reminder to {reg.email}: {e}")
                    if registrations:
                        db.commit()
                        print(f"[REMINDER DAEMON] Sent {len(registrations)} reminders for webinar: {webinar.topic}")
            finally:
                db.close()
        except asyncio.CancelledError:
            print("[REMINDER DAEMON] Daemon cancelled.")
            break
        except Exception as e:
            print(f"[REMINDER DAEMON] Error: {e}")

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(webinar_reminder_daemon())
    print("[STARTUP] Webinar reminder daemon scheduled.")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
