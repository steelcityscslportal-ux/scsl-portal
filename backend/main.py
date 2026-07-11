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
import hmac
import datetime
import asyncio
import razorpay
from sqlalchemy.orm import Session
from database import SessionLocal, Contact, Registration, PageView, AdminLogin, AccountOpening, Webinar, Feedback, AdminUser, SystemSetting, HomepageContent, CRMClient, CRMPortfolio, CRMTask, CRMLead
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

class PaymentInitiateReq(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    webinar_id: int
    topic: str
    date: str
    otp: str

class PaymentVerifyReq(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str
    registration_id: int

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

# ─── CRM PYDANTIC MODELS ─────────────────────────────────
class ClientLoginReq(BaseModel):
    username: str
    password: str

class CRMClientCreateReq(BaseModel):
    name: str
    username: str
    password_raw: str
    email: str
    phone: str
    pan: Optional[str] = ""
    dob: Optional[str] = ""
    address: Optional[str] = ""
    rm_name: Optional[str] = "Adviser RM"
    status: Optional[str] = "Active"

class CRMPortfolioReq(BaseModel):
    scheme_name: str
    folio_number: Optional[str] = ""
    units: float
    purchase_price: float
    current_nav: float
    asset_class: Optional[str] = "Equity"

class CRMTaskReq(BaseModel):
    title: str
    description: Optional[str] = ""
    type: Optional[str] = "Call"  # Call, Meeting, Email, Task
    status: Optional[str] = "Pending"  # Pending, Completed
    due_date: Optional[str] = None  # ISO format string or None

class CRMLeadReq(BaseModel):
    name: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    source: Optional[str] = "Website"
    status: Optional[str] = "Contacted"
    remarks: Optional[str] = ""


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
    elif key == "razorpay_key_id":
        return os.environ.get("RAZORPAY_KEY_ID", "rzp_test_5jFwLpxR2MhG1F").strip()
    elif key == "razorpay_key_secret":
        return os.environ.get("RAZORPAY_KEY_SECRET", "test_secret_placeholder").strip()
    elif key == "razorpay_webhook_secret":
        return os.environ.get("RAZORPAY_WEBHOOK_SECRET", "test_webhook_secret_placeholder").strip()
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

# ─── CRM Client Authentication Helper ─────────────────────

def authenticate_crm_client(request: Request, credentials: HTTPBasicCredentials = Depends(security), db: Session = Depends(get_db)) -> CRMClient:
    client = db.query(CRMClient).filter(CRMClient.username == credentials.username).first()
    if not client or client.password_raw != credentials.password:
        raise HTTPException(
            status_code=401,
            detail="Incorrect CRM username or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    if client.status != "Active":
        raise HTTPException(
            status_code=403,
            detail="Your CRM account has been deactivated. Please contact support."
        )
    return client

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
    now = datetime.datetime.utcnow()
    # Filter webinars: show only if start_time is null OR start_time is in the future
    webinars = db.query(Webinar).filter((Webinar.start_time == None) | (Webinar.start_time >= now)).order_by(Webinar.id.asc()).all()
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
            "start_time": w.start_time.isoformat() if w.start_time else None
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
    start_time: Optional[datetime.datetime] = None

@app.post("/api/webinars/save")
async def save_webinar(req: WebinarSaveReq, username: str = Depends(authenticate_admin), db: Session = Depends(get_db)):
    naive_start_time = None
    if req.start_time:
        if req.start_time.tzinfo:
            naive_start_time = req.start_time.astimezone(datetime.timezone.utc).replace(tzinfo=None)
        else:
            naive_start_time = req.start_time

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
        w.start_time           = naive_start_time
    else:
        w = Webinar(
            trainer=req.trainer, region=req.region, date=req.date,
            day=req.day, time=req.time, topic=req.topic, mode=req.mode,
            seats=req.seats, link=req.link, avatar_url=req.avatar_url,
            is_paid=req.is_paid, fee_amount=req.fee_amount,
            payment_utr_required=req.payment_utr_required,
            start_time=naive_start_time
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

# --- Real-time caching variables and fetch function ---
market_cache = {
    "data": None,
    "last_updated": 0
}
news_cache = {
    "data": None,
    "last_updated": 0
}
CACHE_DURATION_SECONDS = 3.0
NEWS_CACHE_DURATION_SECONDS = 30.0

async def fetch_realtime_market_data():
    global market_cache
    now = time.time()
    if market_cache["data"] and (now - market_cache["last_updated"] < CACHE_DURATION_SECONDS):
        return market_cache["data"]

    try:
        # 1. Fetch Indices from Capital Market
        indices_url = "https://api.capitalmarket.com/api/Indices"
        req = urllib.request.Request(indices_url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        indices_data = {}
        try:
            with urllib.request.urlopen(req, timeout=3) as response:
                res = json.loads(response.read().decode('utf-8'))
                if res.get("success"):
                    for item in res.get("data", []):
                        indices_data[item["lname"]] = item
        except Exception as e:
            print("Failed to fetch Indices from Capital Market:", e)

        # 2. Fetch USDINR from Yahoo
        usdinr_price = 83.5
        usdinr_prev = 83.5
        try:
            url = "https://query1.finance.yahoo.com/v8/finance/chart/USDINR=X"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=3) as response:
                res = json.loads(response.read().decode('utf-8'))
                meta = res['chart']['result'][0]['meta']
                usdinr_price = meta.get('regularMarketPrice', 83.5)
                usdinr_prev = meta.get('previousClose', 83.5)
        except Exception as e:
            print("Failed to fetch USDINR from Yahoo:", e)

        # 3. Fetch JPY=X, STEELCITY.NS, GC=F, CL=F from Yahoo
        prices = {}
        for sym in ["STEELCITY.NS", "JPY=X", "GC=F", "CL=F"]:
            try:
                url = f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}"
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=3) as response:
                    res = json.loads(response.read().decode('utf-8'))
                    meta = res['chart']['result'][0]['meta']
                    prices[sym] = {
                        "price": meta.get('regularMarketPrice'),
                        "prev": meta.get('previousClose')
                    }
            except Exception as e:
                print(f"Failed to fetch {sym} from Yahoo:", e)

        result = []
        
        def fmt(val, decimals=2):
            sign = "+" if val >= 0 else ""
            return f"{sign}{val:,.{decimals}f}"

        # 1. NIFTY 50
        if "Nifty 50" in indices_data:
            item = indices_data["Nifty 50"]
            last = item["Last"]
            chg_pct = item["Change"]
            prev = last / (1 + chg_pct / 100) if chg_pct != -100 else last
            diff = last - prev
            result.append({
                "symbol": "NIFTY 50",
                "price": f"{last:,.2f}",
                "change": fmt(diff),
                "percent": fmt(chg_pct) + "%",
                "up": diff >= 0
            })
        else:
            sim = simulate_price(BASE_DATA["NIFTY 50"]["price"])
            result.append({"symbol": "NIFTY 50", **sim})

        # 2. SENSEX
        if "SENSEX" in indices_data:
            item = indices_data["SENSEX"]
            last = item["Last"]
            chg_pct = item["Change"]
            prev = last / (1 + chg_pct / 100) if chg_pct != -100 else last
            diff = last - prev
            result.append({
                "symbol": "SENSEX",
                "price": f"{last:,.2f}",
                "change": fmt(diff),
                "percent": fmt(chg_pct) + "%",
                "up": diff >= 0
            })
        else:
            sim = simulate_price(BASE_DATA["SENSEX"]["price"])
            result.append({"symbol": "SENSEX", **sim})

        # 3. BANK NIFTY
        if "Nifty Bank" in indices_data:
            item = indices_data["Nifty Bank"]
            last = item["Last"]
            chg_pct = item["Change"]
            prev = last / (1 + chg_pct / 100) if chg_pct != -100 else last
            diff = last - prev
            result.append({
                "symbol": "BANK NIFTY",
                "price": f"{last:,.2f}",
                "change": fmt(diff),
                "percent": fmt(chg_pct) + "%",
                "up": diff >= 0
            })
        else:
            sim = simulate_price(BASE_DATA["BANK NIFTY"]["price"])
            result.append({"symbol": "BANK NIFTY", **sim})

        # 4. SCSL (STEELCITY.NS)
        if "STEELCITY.NS" in prices and prices["STEELCITY.NS"]["price"] is not None:
            item = prices["STEELCITY.NS"]
            last = item["price"]
            prev = item["prev"]
            diff = last - prev
            chg_pct = (diff / prev) * 100 if prev else 0
            result.append({
                "symbol": "SCSL",
                "price": f"{last:,.2f}",
                "change": fmt(diff),
                "percent": fmt(chg_pct) + "%",
                "up": diff >= 0
            })
        else:
            sim = simulate_price(BASE_DATA["SCSL"]["price"])
            result.append({"symbol": "SCSL", **sim})

        # 5. USD/INR
        if usdinr_price:
            diff = usdinr_price - usdinr_prev
            chg_pct = (diff / usdinr_prev) * 100 if usdinr_prev else 0
            result.append({
                "symbol": "USD/INR",
                "price": f"{usdinr_price:,.4f}",
                "change": fmt(diff, 4),
                "percent": fmt(chg_pct) + "%",
                "up": diff >= 0
            })
        else:
            sim = simulate_price(BASE_DATA["USD/INR"]["price"])
            result.append({"symbol": "USD/INR", **sim})

        # 6. GOLD MCX
        if "GC=F" in prices and prices["GC=F"]["price"] is not None:
            last_usd = prices["GC=F"]["price"]
            prev_usd = prices["GC=F"]["prev"]
            last_inr = (last_usd / 31.1035) * 10 * usdinr_price
            prev_inr = (prev_usd / 31.1035) * 10 * usdinr_prev
            diff = last_inr - prev_inr
            chg_pct = (diff / prev_inr) * 100 if prev_inr else 0
            result.append({
                "symbol": "GOLD MCX",
                "price": f"{last_inr:,.2f}",
                "change": fmt(diff),
                "percent": fmt(chg_pct) + "%",
                "up": diff >= 0
            })
        else:
            sim = simulate_price(BASE_DATA["GOLD MCX"]["price"])
            result.append({"symbol": "GOLD MCX", **sim})

        # 7. CRUDE OIL
        if "CL=F" in prices and prices["CL=F"]["price"] is not None:
            last_usd = prices["CL=F"]["price"]
            prev_usd = prices["CL=F"]["prev"]
            last_inr = last_usd * usdinr_price
            prev_inr = prev_usd * usdinr_prev
            diff = last_inr - prev_inr
            chg_pct = (diff / prev_inr) * 100 if prev_inr else 0
            result.append({
                "symbol": "CRUDE OIL",
                "price": f"{last_inr:,.2f}",
                "change": fmt(diff),
                "percent": fmt(chg_pct) + "%",
                "up": diff >= 0
            })
        else:
            sim = simulate_price(BASE_DATA["CRUDE OIL"]["price"])
            result.append({"symbol": "CRUDE OIL", **sim})

        # 8. USD/JPY
        if "JPY=X" in prices and prices["JPY=X"]["price"] is not None:
            item = prices["JPY=X"]
            last = item["price"]
            prev = item["prev"]
            diff = last - prev
            chg_pct = (diff / prev) * 100 if prev else 0
            result.append({
                "symbol": "USD/JPY",
                "price": f"{last:,.2f}",
                "change": fmt(diff),
                "percent": fmt(chg_pct) + "%",
                "up": diff >= 0
            })
        else:
            sim = simulate_price(BASE_DATA["USD/JPY"]["price"])
            result.append({"symbol": "USD/JPY", **sim})

        market_cache["data"] = result
        market_cache["last_updated"] = now
        return result
    except Exception as e:
        print("Error in fetch_realtime_market_data:", e)
        if market_cache["data"]:
            return market_cache["data"]
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

@app.get("/api/market-watch")
async def market_watch():
    return await fetch_realtime_market_data()

@app.get("/api/live-news")
async def live_news():
    global news_cache
    now = time.time()
    if news_cache["data"] and (now - news_cache["last_updated"] < NEWS_CACHE_DURATION_SECONDS):
        return news_cache["data"]

    try:
        url = "https://api.capitalmarket.com/api/CmLiveNewsHome/A/15"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req, timeout=4) as response:
            res = json.loads(response.read().decode('utf-8'))
            if res.get("success"):
                raw_data = res.get("data", [])
                formatted_news = []
                for item in raw_data:
                    formatted_news.append({
                        "id": item.get("SNO"),
                        "heading": item.get("Heading"),
                        "caption": item.get("Caption"),
                        "date": item.get("Date"),
                        "time": item.get("Time"),
                        "section": item.get("sectionname")
                    })
                news_cache["data"] = formatted_news
                news_cache["last_updated"] = now
                return formatted_news
    except Exception as e:
        print("Failed to fetch live news from capitalmarket.com:", e)

    if news_cache["data"]:
        return news_cache["data"]

    fallback = [
        {
            "id": 1,
            "heading": "Steel City Securities Limited Expands Demat Services Across India",
            "caption": "SCSL announces opening of 50 new digital facilitation centers across Tier-2 and Tier-3 cities to support local retail investors.",
            "date": "14 Jun 2026",
            "time": "10:30",
            "section": "Corporate News"
        },
        {
            "id": 2,
            "heading": "Nifty 50 Hits Record High on Strong Foreign Institutional Inflows",
            "caption": "NSE Nifty index records historic gains led by IT, Banking, and Reliance Industries shares amid global market optimism.",
            "date": "14 Jun 2026",
            "time": "09:45",
            "section": "Market Commentary"
        },
        {
            "id": 3,
            "heading": "SCSL Investor Awareness Web-Program Sees Record Registrations",
            "caption": "Over 10,000 retail traders register for the upcoming Free Stock Market Training Program hosted by certified SCSL mentors.",
            "date": "13 Jun 2026",
            "time": "15:20",
            "section": "Press Release"
        },
        {
            "id": 4,
            "heading": "SEBI Proposes New Guidelines to Simplify demat Account Opening",
            "caption": "Market regulator SEBI releases consultation paper aiming to make the paperless demat onboarding process more secure and faster.",
            "date": "12 Jun 2026",
            "time": "16:45",
            "section": "Regulatory News"
        },
        {
            "id": 5,
            "heading": "Indian Rupee Stabilizes Against US Dollar as Crude Prices Ease",
            "caption": "The INR gains strength as Brent crude prices contract slightly, providing relief to India's fiscal deficit and import bills.",
            "date": "12 Jun 2026",
            "time": "11:15",
            "section": "Currency Market"
        }
    ]
    return fallback


@app.get("/api/live-news/{sno}")
async def live_news_detail(sno: int):
    # Check if fallback ID
    if sno <= 5:
        fallbacks_detail = {
            1: {
                "id": 1,
                "heading": "Steel City Securities Limited Expands Demat Services Across India",
                "caption": "SCSL announces opening of 50 new digital facilitation centers across Tier-2 and Tier-3 cities to support local retail investors.",
                "date": "14 Jun 2026",
                "time": "10:30",
                "section": "Corporate News",
                "arttext": "Steel City Securities Limited (SCSL), a pioneer in retail stockbroking and e-governance services, has announced a major retail demat expansion plan. The company will open 50 new digital facilitation centers across Tier-2 and Tier-3 cities over the next three quarters.<P>These centers will provide paperless instant onboarding for demat accounts, NPS registration, and insurance services. By leveraging advanced e-KYC and digital signing solutions, SCSL aims to make investment services accessible to millions of emerging investors in semi-urban areas.<P>The initiative is expected to drive customer acquisition by 25% and consolidate Steel City's leadership in regional markets. In addition, localized training sessions will be hosted at these centers to boost financial literacy and safe trading habits.",
                "IllustrationImage": "https://www.capitalmarket.com/IImagesNew/Steelcity_logo.png"
            },
            2: {
                "id": 2,
                "heading": "Nifty 50 Hits Record High on Strong Foreign Institutional Inflows",
                "caption": "NSE Nifty index records historic gains led by IT, Banking, and Reliance Industries shares amid global market optimism.",
                "date": "14 Jun 2026",
                "time": "09:45",
                "section": "Market Commentary",
                "arttext": "The benchmark NSE Nifty 50 index crossed historic thresholds today, closing at all-time highs led by aggressive institutional buying. Market analysts attribute this momentum to robust foreign portfolio investor (FPI) inflows and strong domestic mutual fund participation.<P>Heavyweights in the IT sector (such as TCS and Infosys) along with major banking names drove the upward charge. The positive earnings season and stable macroeconomic parameters released by the central bank have further fueled investor confidence.<P>Global markets also showed positive cues, with expectations of interest rate cuts by the US Federal Reserve supporting risk-on assets in emerging economies like India.",
                "IllustrationImage": ""
            },
            3: {
                "id": 3,
                "heading": "SCSL Investor Awareness Web-Program Sees Record Registrations",
                "caption": "Over 10,000 retail traders register for the upcoming Free Stock Market Training Program hosted by certified SCSL mentors.",
                "date": "13 Jun 2026",
                "time": "15:20",
                "section": "Press Release",
                "arttext": "Steel City Securities Limited's free stock market training program has witnessed record-breaking registrations. Over 10,000 retail traders and students from across India have registered for the upcoming three-day digital workshop.<P>The program, structured by senior market experts, covers topics ranging from basic demat operations and long-term asset allocation to advanced technical analysis and option trading strategies.<P>A company spokesperson stated: 'We believe financial education is the cornerstone of responsible investing. Our goal is to empower retail investors with institutional-grade knowledge so they can navigate market cycles confidently and safely.'",
                "IllustrationImage": ""
            },
            4: {
                "id": 4,
                "heading": "SEBI Proposes New Guidelines to Simplify demat Account Opening",
                "caption": "Market regulator SEBI releases consultation paper aiming to make the paperless demat onboarding process more secure and faster.",
                "date": "12 Jun 2026",
                "time": "16:45",
                "section": "Regulatory News",
                "arttext": "The Securities and Exchange Board of India (SEBI) has released a new consultation paper outlining steps to simplify and secure the demat account opening process.<P>The proposed guidelines suggest a standardized paperless onboarding workflow that incorporates facial recognition, geofencing, and AI-driven document verification to eliminate identity fraud and reduce onboarding times to under 5 minutes.<P>Industry players have welcomed the recommendations, noting that these measures will drastically reduce administrative costs and improve compliance across the brokerage ecosystem.",
                "IllustrationImage": ""
            },
            5: {
                "id": 5,
                "heading": "Indian Rupee Stabilizes Against US Dollar as Crude Prices Ease",
                "caption": "The INR gains strength as Brent crude prices contract slightly, providing relief to India's fiscal deficit and import bills.",
                "date": "12 Jun 2026",
                "time": "11:15",
                "section": "Currency Market",
                "arttext": "The Indian Rupee (INR) recorded solid gains against the US Dollar (USD), closing higher as international Brent crude prices fell below key levels. Lower crude prices directly benefit India's current account deficit and inflation outlook.<P>The Reserve Bank of India (RBI) was also reported to have intervened selectively to curb extreme volatility, ensuring stability for exporters and importers alike.<P>Treasury managers anticipate the rupee to trade in a tight, stable range in the coming weeks, supported by robust foreign exchange reserves and strong local economic growth projections.",
                "IllustrationImage": ""
            }
        }
        return fallbacks_detail.get(sno, {"error": "News not found"})

    try:
        url = f"https://api.capitalmarket.com/api/CmLiveNews/{sno}"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req, timeout=4) as response:
            res = json.loads(response.read().decode('utf-8'))
            if res.get("success"):
                raw_data = res.get("data", [])
                if raw_data:
                    # Find exact match or default to first
                    item = raw_data[0]
                    for x in raw_data:
                        if x.get("SNO") == sno:
                            item = x
                            break
                    return {
                        "id": item.get("SNO"),
                        "heading": item.get("Heading"),
                        "caption": item.get("Caption"),
                        "date": item.get("Date"),
                        "time": item.get("Time"),
                        "section": item.get("sectionname"),
                        "arttext": item.get("arttext"),
                        "IllustrationImage": item.get("IllustrationImage"),
                        "KeyWords": item.get("KeyWords")
                    }
    except Exception as e:
        print(f"Failed to fetch live news detail for {sno}:", e)
    
    return {"error": "Failed to retrieve story details. Please check your connection."}


# ─── Tabbed Market Search Dashboard Endpoints ──────────

DEFAULT_SCRIPS = {
    "equity": ["RELIANCE.NS", "TCS.NS", "INFY.NS", "SBIN.NS", "ITC.NS", "TATAMOTORS.NS", "SAIL.NS", "HDFCBANK.NS"],
    "mf": ["0P0000XWLL.BO", "0P0000XVKY.BO", "0P0000XVKS.BO", "0P0000XVKR.BO"],
    "commodity": ["GC=F", "SI=F", "CL=F", "NG=F", "HG=F"],
    "currency": ["USDINR=X", "EURINR=X", "GBPINR=X", "JPYINR=X"],
    "indices": ["^NSEI", "^BSESN", "^NSEBANK", "^CNXIT", "^GSPC", "^DJI"],
    "futures": ["ES=F", "NQ=F", "YM=F", "GC=F", "CL=F"]
}

MOCK_IPOS = [
    {"company": "Swiggy Limited", "price_band": "₹371 - ₹390", "size": "₹11,327 Cr", "date": "12-14 Jun 2026", "status": "Open", "subscription": "3.25x"},
    {"company": "Acme Solar Holdings", "price_band": "₹275 - ₹289", "size": "₹2,900 Cr", "date": "22-24 Jun 2026", "status": "Upcoming", "subscription": "N/A"},
    {"company": "Zinka Logistics (BlackBuck)", "price_band": "₹250 - ₹273", "size": "₹1,114 Cr", "date": "28-30 Jun 2026", "status": "Upcoming", "subscription": "N/A"},
    {"company": "Hyundai Motor India", "price_band": "₹1860 - ₹1960", "size": "₹27,870 Cr", "date": "15 Oct 2025", "status": "Listed", "subscription": "2.37x", "current_price": "₹1,780"},
    {"company": "Bajaj Housing Finance", "price_band": "₹66 - ₹70", "size": "₹6,560 Cr", "date": "09 Sep 2024", "status": "Listed", "subscription": "63.7x", "current_price": "₹142"},
    {"company": "Ola Electric Mobility", "price_band": "₹72 - ₹76", "size": "₹6,145 Cr", "date": "02 Aug 2024", "status": "Listed", "subscription": "4.27x", "current_price": "₹95"}
]

MOCK_RESEARCH = [
    {"symbol": "RELIANCE", "name": "Reliance Industries Ltd", "rating": "BUY", "target": "₹1,550", "cmp": "₹1,296", "broker": "SCSL Wealth Research", "summary": "Retail expansions and Jio 5G tariff hikes expected to drive double-digit EBITDA growth. Demerger of financial services unlocks value."},
    {"symbol": "TCS", "name": "Tata Consultancy Services Ltd", "rating": "HOLD", "target": "₹4,200", "cmp": "₹3,850", "broker": "SCSL Tech Research", "summary": "Strong order book in cloud migration and enterprise AI, but headwinds in banking sector budgets lead to conservative margins."},
    {"symbol": "SBIN", "name": "State Bank of India", "rating": "BUY", "target": "₹1,150", "cmp": "₹1,016", "broker": "SCSL Banking Desk", "summary": "Net Interest Margin remains stable. Historic low gross NPA ratios and 15% credit growth indicate a solid balance sheet."},
    {"symbol": "INFY", "name": "Infosys Limited", "rating": "BUY", "target": "₹1,750", "cmp": "₹1,520", "broker": "SCSL Tech Research", "summary": "Accelerating digital transformation deals and strong European performance supporting near-term guidance revisions."},
    {"symbol": "ITC", "name": "ITC Limited", "rating": "BUY", "target": "₹550", "cmp": "₹480", "broker": "SCSL Consumer Desk", "summary": "Demerger of Hotel business progresses smoothly. Cigarette volume growth is highly stable and dividend payout yields 3.8%."}
]

MOCK_BONDS = [
    {"name": "Sovereign Gold Bond (SGB) Series III", "coupon": "2.50% p.a.", "yield": "6.20%", "maturity": "Dec 2031", "rating": "Sovereign", "type": "Government"},
    {"name": "NHAI Tax Free Bonds 2026", "coupon": "7.35% p.a.", "yield": "5.40%", "maturity": "Dec 2026", "rating": "AAA", "type": "Public Sector"},
    {"name": "REC Tax Free Bonds 2027", "coupon": "7.22% p.a.", "yield": "5.45%", "maturity": "Mar 2027", "rating": "AAA", "type": "Public Sector"},
    {"name": "SBI Perpetual Basel III Tier-I Bond", "coupon": "8.10% p.a.", "yield": "7.90%", "maturity": "Perpetual", "rating": "AA+", "type": "Financial"},
    {"name": "Nabard Corporate Bond 2029", "coupon": "7.65% p.a.", "yield": "7.50%", "maturity": "Jun 2029", "rating": "AAA", "type": "Corporate"},
    {"name": "Govt of India 7.18% GS 2033", "coupon": "7.18% p.a.", "yield": "7.12%", "maturity": "Aug 2033", "rating": "Sovereign", "type": "Government"}
]

def get_yahoo_search(q: str):
    url = f"https://query1.finance.yahoo.com/v1/finance/search?q={urllib.parse.quote(q)}&quotesCount=10"
    headers = {'User-Agent': 'Mozilla/5.0'}
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=3) as res:
            return json.loads(res.read().decode('utf-8')).get("quotes", [])
    except Exception as e:
        print("Yahoo search error:", e)
        return []

def get_yahoo_news(q: str):
    url = f"https://query1.finance.yahoo.com/v1/finance/search?q={urllib.parse.quote(q)}&newsCount=8"
    headers = {'User-Agent': 'Mozilla/5.0'}
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=3) as res:
            return json.loads(res.read().decode('utf-8')).get("news", [])
    except Exception as e:
        print("Yahoo news search error:", e)
        return []

def get_yahoo_quote_sync(symbol: str):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
    headers = {'User-Agent': 'Mozilla/5.0'}
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=3) as res:
            data = json.loads(res.read().decode('utf-8'))
            meta = data['chart']['result'][0]['meta']
            return {
                "symbol": symbol,
                "price": meta.get('regularMarketPrice'),
                "prev": meta.get('previousClose'),
                "exchange": meta.get('exchangeName', '')
            }
    except Exception as e:
        return {"symbol": symbol, "error": str(e)}

async def fetch_yahoo_quote(symbol: str):
    return await asyncio.to_thread(get_yahoo_quote_sync, symbol)

@app.get("/api/search")
async def search_market(q: str = "", category: str = "equity"):
    category = category.lower().strip()
    q = q.strip()
    
    if category == "news":
        cm_news = []
        try:
            cm_news = await live_news()
        except Exception:
            pass
            
        yahoo_news = []
        if q:
            yahoo_news = await asyncio.to_thread(get_yahoo_news, q)
            
        filtered_cm = []
        for item in cm_news:
            if not q or q.lower() in item["heading"].lower() or q.lower() in item.get("caption", "").lower():
                filtered_cm.append({
                    "id": item["id"],
                    "heading": item["heading"],
                    "caption": item["caption"],
                    "date": item["date"],
                    "time": item["time"],
                    "section": item["section"],
                    "link": f"https://www.capitalmarket.com/News/Live-News/{item['id']}"
                })
                
        formatted_yahoo = []
        for idx, item in enumerate(yahoo_news):
            pub_time = item.get("providerPublishTime", 0)
            date_str = ""
            time_str = ""
            if pub_time:
                dt = datetime.datetime.fromtimestamp(pub_time)
                date_str = dt.strftime("%d %b %Y")
                time_str = dt.strftime("%H:%M")
                
            formatted_yahoo.append({
                "id": 1000 + idx,
                "heading": item.get("title", ""),
                "caption": f"Published by {item.get('publisher', 'Yahoo Finance')}",
                "date": date_str,
                "time": time_str,
                "section": "Global Market News",
                "link": item.get("link", "")
            })
            
        return filtered_cm + formatted_yahoo
        
    elif category in ["equity", "mf", "commodity", "currency", "indices", "futures"]:
        symbols = []
        quotes = []
        
        if not q:
            symbols = DEFAULT_SCRIPS.get(category, [])
        else:
            quotes = await asyncio.to_thread(get_yahoo_search, q)
            for item in quotes:
                sym = item.get("symbol", "")
                qtype = item.get("quoteType", "").lower()
                exch = item.get("exchDisp", "").lower()
                
                if category == "equity" and qtype == "equity":
                    symbols.append(sym)
                elif category == "mf" and qtype in ["mutualfund", "etf"]:
                    symbols.append(sym)
                elif category == "commodity" and qtype == "future" and ("commodity" in exch or sym in DEFAULT_SCRIPS["commodity"] or any(c in sym.lower() for c in ["gc=f", "si=f", "cl=f", "ng=f", "hg=f"])):
                    symbols.append(sym)
                elif category == "currency" and qtype == "currency":
                    symbols.append(sym)
                elif category == "indices" and qtype == "index":
                    symbols.append(sym)
                elif category == "futures" and qtype == "future":
                    symbols.append(sym)
            
            symbols = list(dict.fromkeys(symbols))[:10]
            if not symbols:
                symbols = [q.upper()]
                
        tasks = [fetch_yahoo_quote(sym) for sym in symbols]
        quote_results = await asyncio.gather(*tasks)
        
        results = []
        names_map = {}
        if q and quotes:
            for item in quotes:
                names_map[item.get("symbol")] = item.get("shortname")
                
        for r in quote_results:
            if "error" in r:
                if q:
                    results.append({
                        "symbol": r["symbol"],
                        "name": r["symbol"],
                        "price": "N/A",
                        "change": "0.00",
                        "percent": "0.00%",
                        "up": True,
                        "exchange": "N/A"
                    })
                continue
                
            price = r.get("price")
            prev = r.get("prev")
            symbol = r.get("symbol")
            exch = r.get("exchange")
            
            if price is not None and prev is not None:
                diff = price - prev
                pct = (diff / prev) * 100 if prev else 0
                sign = "+" if diff >= 0 else ""
                
                dec = 4 if price < 2 else 2
                price_str = f"{price:,.{dec}f}"
                diff_str = f"{sign}{diff:,.{dec}f}"
                pct_str = f"{sign}{pct:,.2f}%"
                
                name = names_map.get(symbol) or symbol
                if name == symbol:
                    name_mapping = {
                        "RELIANCE.NS": "RELIANCE INDUSTRIES LTD",
                        "TCS.NS": "TATA CONSULTANCY SERVICES",
                        "INFY.NS": "INFOSYS LIMITED",
                        "SBIN.NS": "STATE BANK OF INDIA",
                        "ITC.NS": "ITC LIMITED",
                        "TATAMOTORS.NS": "TATA MOTORS LIMITED",
                        "SAIL.NS": "STEEL AUTHORITY OF INDIA",
                        "HDFCBANK.NS": "HDFC BANK LIMITED",
                        "GC=F": "GOLD FUTURES",
                        "SI=F": "SILVER FUTURES",
                        "CL=F": "CRUDE OIL FUTURES",
                        "NG=F": "NATURAL GAS FUTURES",
                        "HG=F": "COPPER FUTURES",
                        "USDINR=X": "USD to INR Exchange Rate",
                        "EURINR=X": "EUR to INR Exchange Rate",
                        "GBPINR=X": "GBP to INR Exchange Rate",
                        "JPYINR=X": "100 JPY to INR Exchange Rate",
                        "^NSEI": "NIFTY 50 INDEX",
                        "^BSESN": "SENSEX INDEX",
                        "^NSEBANK": "NIFTY BANK INDEX",
                        "^CNXIT": "NIFTY IT INDEX",
                        "^GSPC": "S&P 500 INDEX",
                        "^DJI": "DOW JONES INDUSTRIAL AVERAGE",
                        "0P0000XWLL.BO": "SBI Bluechip Fund - Direct Growth",
                        "0P0000XVKY.BO": "Parag Parikh Flexi Cap - Direct Growth",
                        "0P0000XVKS.BO": "HDFC Mid-Cap Opportunities - Growth",
                        "0P0000XVKR.BO": "ICICI Prudential Bluechip - Growth"
                    }
                    name = name_mapping.get(symbol, symbol)
                
                results.append({
                    "symbol": symbol,
                    "name": name,
                    "price": price_str,
                    "change": diff_str,
                    "percent": pct_str,
                    "up": diff >= 0,
                    "exchange": "NSE" if symbol.endswith(".NS") else "BSE" if symbol.endswith(".BO") else exch or "Global"
                })
        return results
        
    elif category == "ipos":
        if not q:
            return MOCK_IPOS
        return [item for item in MOCK_IPOS if q.lower() in item["company"].lower()]
        
    elif category == "research":
        if not q:
            return MOCK_RESEARCH
        filtered = [item for item in MOCK_RESEARCH if q.lower() in item["symbol"].lower() or q.lower() in item["name"].lower()]
        if not filtered:
            symbol_up = q.upper()
            filtered = [{
                "symbol": symbol_up,
                "name": f"{symbol_up} Group Corporation",
                "rating": random.choice(["BUY", "HOLD", "SELL"]),
                "target": "₹" + f"{random.randint(150, 5000):,}",
                "cmp": "₹" + f"{random.randint(100, 4000):,}",
                "broker": "SCSL Wealth Research",
                "summary": f"Analytical view on {symbol_up}. Reviewing near-term capital expenditure plans and product line execution. Corporate balance sheet remains healthy with low leverage ratios."
            }]
        return filtered
        
    elif category == "bonds":
        if not q:
            return MOCK_BONDS
        return [item for item in MOCK_BONDS if q.lower() in item["name"].lower()]
        
    return []


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
async def register_webinar(reg: WebinarRegistration, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
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
    is_paid_webinar = webinar.is_paid if webinar else False
    if webinar and webinar.is_paid:
        if webinar.payment_utr_required and not (reg.payment_utr or "").strip():
            raise HTTPException(status_code=400, detail="Payment UTR/reference is required for this webinar. Please complete payment and enter your UTR.")
        pay_status = "pending"  # Under review initially
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

    # Send confirmation email in background (non-blocking) ONLY for free webinars.
    # Paid webinars will trigger this email when approved by admin.
    if not is_paid_webinar:
        try:
            join_link = webinar.link if webinar and webinar.link else ""
            time_str  = webinar.time if webinar else reg.date
            background_tasks.add_task(
                send_registration_confirmation_email,
                reg.email,
                reg.name,
                reg.topic,
                reg.date,
                time_str,
                join_link,
                db
            )
        except Exception as e:
            print(f"[CONFIRM EMAIL] Failed to queue confirmation email to {reg.email}: {e}")

    msg_suffix = " Please wait for admin verification of your payment." if is_paid_webinar else ""
    return {"success": True, "message": f"Successfully registered for: {reg.topic}!{msg_suffix}"}

@app.post("/api/payment/initiate")
async def initiate_payment(req: PaymentInitiateReq, db: Session = Depends(get_db)):
    email = req.email.strip().lower()
    
    # Check if OTP exists for this email
    if email not in otp_store:
        raise HTTPException(status_code=400, detail="No OTP was requested for this email. Please request an OTP first.")
    
    stored = otp_store[email]
    
    # Check OTP expiry
    if time.time() - stored["timestamp"] > OTP_EXPIRY_SECONDS:
        del otp_store[email]
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
    
    # Verify OTP
    if req.otp.strip() != stored["otp"]:
        raise HTTPException(status_code=400, detail="Invalid OTP. Please check and try again.")
    
    # OTP verified — remove it so it can't be reused
    del otp_store[email]
    
    webinar = db.query(Webinar).filter(Webinar.id == req.webinar_id).first()
    if not webinar:
        raise HTTPException(status_code=404, detail="Webinar not found.")
    if not webinar.is_paid:
        raise HTTPException(status_code=400, detail="This webinar is free. Please register directly.")
        
    registration = Registration(
        name=req.name,
        email=req.email,
        phone=req.phone,
        webinar_id=req.webinar_id,
        topic=req.topic,
        date=req.date,
        payment_status="pending",
        fee_paid=webinar.fee_amount or 0.0,
        payment_utr=""
    )
    db.add(registration)
    db.commit()
    db.refresh(registration)
    
    key_id = get_setting(db, "razorpay_key_id")
    key_secret = get_setting(db, "razorpay_key_secret")
    
    client = razorpay.Client(auth=(key_id, key_secret))
    amount_in_paise = int((webinar.fee_amount or 0.0) * 100)
    
    order_data = {
        "amount": amount_in_paise,
        "currency": "INR",
        "receipt": f"reg_{registration.id}",
        "notes": {
            "registration_id": registration.id,
            "webinar_id": webinar.id,
            "name": req.name,
            "email": req.email
        }
    }
    
    try:
        order = client.order.create(data=order_data)
        registration.payment_utr = f"ORDER_ID:{order['id']}"
        db.commit()
        
        return {
            "success": True,
            "order_id": order["id"],
            "amount": amount_in_paise,
            "currency": "INR",
            "key_id": key_id,
            "registration_id": registration.id
        }
    except Exception as e:
        print(f"[RAZORPAY ORDER ERROR] {e}")
        db.delete(registration)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to initiate payment: {str(e)}")

@app.post("/api/payment/verify")
async def verify_payment(req: PaymentVerifyReq, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    key_secret = get_setting(db, "razorpay_key_secret")
    msg = f"{req.razorpay_order_id}|{req.razorpay_payment_id}"
    try:
        generated_signature = hmac.new(
            key_secret.encode('utf-8'),
            msg.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        if not secrets.compare_digest(generated_signature, req.razorpay_signature):
            raise HTTPException(status_code=400, detail="Invalid signature. Payment verification failed.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Payment signature check failed: {str(e)}")
        
    reg = db.query(Registration).filter(Registration.id == req.registration_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration record not found.")
        
    if reg.payment_status == "paid":
        return {"success": True, "message": "Payment already verified."}
        
    reg.payment_status = "paid"
    reg.payment_utr = req.razorpay_payment_id
    db.commit()
    
    webinar = db.query(Webinar).filter(Webinar.id == reg.webinar_id).first()
    try:
        join_link = webinar.link if webinar and webinar.link else ""
        time_str  = webinar.time if webinar else reg.date
        background_tasks.add_task(
            send_registration_confirmation_email,
            reg.email,
            reg.name,
            reg.topic,
            reg.date,
            time_str,
            join_link,
            db
        )
    except Exception as e:
        print(f"[PAYMENT VERIFY EMAIL] Failed to send confirmation email: {e}")
        
    return {"success": True, "message": "Payment verified and registration confirmed successfully!"}

@app.post("/api/payment/webhook")
async def razorpay_webhook(request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    webhook_secret = get_setting(db, "razorpay_webhook_secret")
    signature = request.headers.get("X-Razorpay-Signature")
    
    if not signature:
        raise HTTPException(status_code=400, detail="Missing X-Razorpay-Signature header")
        
    body = await request.body()
    try:
        generated_signature = hmac.new(
            webhook_secret.encode('utf-8'),
            body,
            hashlib.sha256
        ).hexdigest()
        
        if not secrets.compare_digest(generated_signature, signature):
            raise HTTPException(status_code=400, detail="Invalid webhook signature")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook signature validation error: {str(e)}")
        
    try:
        event_data = json.loads(body.decode('utf-8'))
        event = event_data.get("event")
        
        if event in ["order.paid", "payment.captured"]:
            payload = event_data.get("payload", {})
            payment = payload.get("payment", {}).get("entity", {})
            order_id = payment.get("order_id")
            payment_id = payment.get("id")
            
            notes = payment.get("notes", {})
            reg_id = notes.get("registration_id")
            
            if not reg_id:
                receipt = payload.get("order", {}).get("entity", {}).get("receipt", "")
                if receipt.startswith("reg_"):
                    try:
                        reg_id = int(receipt.replace("reg_", ""))
                    except ValueError:
                        pass
            
            if reg_id:
                reg = db.query(Registration).filter(Registration.id == reg_id).first()
                if reg and reg.payment_status != "paid":
                    reg.payment_status = "paid"
                    reg.payment_utr = payment_id
                    db.commit()
                    
                    webinar = db.query(Webinar).filter(Webinar.id == reg.webinar_id).first()
                    try:
                        join_link = webinar.link if webinar and webinar.link else ""
                        time_str  = webinar.time if webinar else reg.date
                        background_tasks.add_task(
                            send_registration_confirmation_email,
                            reg.email,
                            reg.name,
                            reg.topic,
                            reg.date,
                            time_str,
                            join_link,
                            db
                        )
                    except Exception as email_err:
                        print(f"[WEBHOOK EMAIL] Failed: {email_err}")
                    print(f"[WEBHOOK] Successfully confirmed payment for registration #{reg_id}")
    except Exception as e:
        print(f"[WEBHOOK ERROR] {e}")
        
    return {"status": "ok"}

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
    page_views = db.query(PageView).order_by(PageView.timestamp.desc()).limit(100).all()
    logins = db.query(AdminLogin).order_by(AdminLogin.timestamp.desc()).limit(100).all()
    account_openings = db.query(AccountOpening).order_by(AccountOpening.timestamp.desc()).all()
    feedbacks = db.query(Feedback).order_by(Feedback.timestamp.desc()).all()
    
    webinars = db.query(Webinar).order_by(Webinar.id.asc()).all()
    webinar_list = []
    for w in webinars:
        reg_count = db.query(Registration).filter(Registration.webinar_id == w.id).count()
        webinar_list.append({
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
            "start_time": w.start_time.isoformat() if w.start_time else None
        })
    
    return {
        "contacts": contacts,
        "registrations": registrations,
        "page_views": page_views,
        "logins": logins,
        "account_openings": account_openings,
        "feedbacks": feedbacks,
        "webinars": webinar_list
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

# ─── Webinar Payment Approval Route ───────────────
class ApprovePaymentReq(BaseModel):
    registration_id: int

@app.post("/api/admin/registrations/approve-payment")
async def approve_payment(req: ApprovePaymentReq, background_tasks: BackgroundTasks, current_user: AdminUser = Depends(authenticate_admin), db: Session = Depends(get_db)):
    reg = db.query(Registration).filter(Registration.id == req.registration_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration record not found.")
    
    if reg.payment_status == "paid":
        return {"success": True, "message": "Payment already approved."}
        
    reg.payment_status = "paid"
    db.commit()
    
    # Send confirmation email containing join details
    webinar = db.query(Webinar).filter(Webinar.id == reg.webinar_id).first()
    try:
        join_link = webinar.link if webinar and webinar.link else ""
        time_str  = webinar.time if webinar else reg.date
        background_tasks.add_task(
            send_registration_confirmation_email,
            reg.email,
            reg.name,
            reg.topic,
            reg.date,
            time_str,
            join_link,
            db
        )
    except Exception as e:
        print(f"[APPROVE PAYMENT EMAIL] Failed to queue confirmation email to {reg.email}: {e}")
        
    return {"success": True, "message": f"Payment approved and confirmation email queued for {reg.email}."}

# ─── Homepage CMS Routes ──────────────────────────
class SaveHomepageReq(BaseModel):
    content: dict

@app.get("/api/homepage-content")
async def get_homepage_content(db: Session = Depends(get_db)):
    items = db.query(HomepageContent).all()
    return {item.key: item.value for item in items}

@app.post("/api/admin/homepage-content")
async def save_homepage_content(req: SaveHomepageReq, username: str = Depends(authenticate_admin), db: Session = Depends(get_db)):
    for k, v in req.content.items():
        if v is None:
            v = ""
        item = db.query(HomepageContent).filter(HomepageContent.key == k).first()
        if item:
            item.value = str(v)
        else:
            item = HomepageContent(key=k, value=str(v))
            db.add(item)
    db.commit()
    return {"success": True, "message": "Homepage content updated successfully."}

# ─── System Settings Routes ─────────────────────────
class SettingUpdateReq(BaseModel):
    key: str
    value: str

SETTING_KEYS = [
    {"key": "brevo_api_key",         "label": "Brevo API Key",                 "type": "password", "hint": "From Brevo dashboard → API Keys"},
    {"key": "smtp_email",            "label": "SMTP / Sender Email",            "type": "text",     "hint": "Gmail or Brevo sender email"},
    {"key": "smtp_password",         "label": "SMTP App Password",             "type": "password", "hint": "Gmail app password (16 chars)"},
    {"key": "smtp_host",             "label": "SMTP Host",                      "type": "text",     "hint": "smtp.gmail.com or smtp-relay.brevo.com"},
    {"key": "smtp_port",             "label": "SMTP Port",                      "type": "text",     "hint": "587 (TLS) or 465 (SSL)"},
    {"key": "reminder_lead_minutes", "label": "Reminder Lead Time (Minutes)",  "type": "text",     "hint": "Minutes before webinar starts to send email reminder. Default: 60"},
    {"key": "razorpay_key_id",       "label": "Razorpay Key ID",               "type": "text",     "hint": "rzp_test_... or rzp_live_..."},
    {"key": "razorpay_key_secret",   "label": "Razorpay Key Secret",           "type": "password", "hint": "Razorpay API Key Secret"},
    {"key": "razorpay_webhook_secret","label": "Razorpay Webhook Secret",       "type": "password", "hint": "Secret used to verify Razorpay webhooks"},
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

# ─── Webinar Reminder Daemon ────────────────
reminder_task_running = False

async def webinar_reminder_daemon():
    """Background async task: checks every 5 minutes for webinars starting in configured lead time and sends reminder emails."""
    global reminder_task_running
    reminder_task_running = True
    print("[REMINDER DAEMON] Started webinar reminder daemon.")
    while True:
        try:
            await asyncio.sleep(300)  # check every 5 minutes
            db = SessionLocal()
            try:
                # Align with Indian Standard Time (IST - UTC+5:30)
                now = datetime.datetime.utcnow() + datetime.timedelta(hours=5, minutes=30)
                
                # Fetch configurable lead minutes
                lead_mins_setting = get_setting(db, "reminder_lead_minutes", "60")
                try:
                    lead_minutes = int(lead_mins_setting.strip())
                except Exception:
                    lead_minutes = 60
                
                target_time = now + datetime.timedelta(minutes=lead_minutes)
                # Check within a 10-minute window (±10 minutes from target time) to catch webinars reliably
                window_start = target_time - datetime.timedelta(minutes=10)
                window_end   = target_time + datetime.timedelta(minutes=10)
                
                webinars = db.query(Webinar).filter(
                    Webinar.start_time >= window_start,
                    Webinar.start_time <= window_end
                ).all()
                
                for webinar in webinars:
                    # Only send reminders to registrations that are either free or approved paid (not pending)
                    registrations = db.query(Registration).filter(
                        Registration.webinar_id == webinar.id,
                        Registration.reminder_sent == False,
                        Registration.payment_status != "pending"
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

# ─── CRM CLIENT ENDPOINTS ────────────────────────────────
@app.post("/api/crm/client/login")
async def crm_client_login(req: ClientLoginReq, db: Session = Depends(get_db)):
    client = db.query(CRMClient).filter(CRMClient.username == req.username).first()
    if not client or client.password_raw != req.password:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if client.status != "Active":
        raise HTTPException(status_code=403, detail="Your CRM account has been deactivated.")
    return {
        "id": client.id,
        "name": client.name,
        "username": client.username,
        "email": client.email,
        "phone": client.phone,
        "pan": client.pan,
        "dob": client.dob,
        "address": client.address,
        "rm_name": client.rm_name,
        "status": client.status,
    }

@app.get("/api/crm/client/dashboard")
async def crm_client_dashboard(current_client: CRMClient = Depends(authenticate_crm_client), db: Session = Depends(get_db)):
    holdings = db.query(CRMPortfolio).filter(CRMPortfolio.client_username == current_client.username).all()
    tasks = db.query(CRMTask).filter(CRMTask.client_username == current_client.username).all()
    
    formatted_tasks = []
    for t in tasks:
        formatted_tasks.append({
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "type": t.type,
            "status": t.status,
            "due_date": t.due_date.isoformat() if t.due_date else None,
            "created_at": t.created_at.isoformat()
        })
        
    return {
        "client": {
            "name": current_client.name,
            "username": current_client.username,
            "email": current_client.email,
            "phone": current_client.phone,
            "pan": current_client.pan,
            "dob": current_client.dob,
            "address": current_client.address,
            "rm_name": current_client.rm_name,
            "status": current_client.status,
        },
        "holdings": [{
            "id": h.id,
            "scheme_name": h.scheme_name,
            "folio_number": h.folio_number,
            "units": h.units,
            "purchase_price": h.purchase_price,
            "current_nav": h.current_nav,
            "current_value": h.current_value,
            "asset_class": h.asset_class,
            "updated_at": h.updated_at.isoformat()
        } for h in holdings],
        "tasks": formatted_tasks
    }

# ─── ADMIN CRM DASHBOARD OVERVIEW ─────────────────────────
@app.get("/api/admin/crm/dashboard")
async def get_admin_crm_dashboard(username: str = Depends(authenticate_admin), db: Session = Depends(get_db)):
    now = datetime.datetime.utcnow()
    today_start = datetime.datetime(now.year, now.month, now.day)
    today_end = today_start + datetime.timedelta(days=1)
    
    # 1. Tasks stats
    overdue_count = db.query(CRMTask).filter(CRMTask.status == "Pending", CRMTask.due_date < today_start).count()
    due_today_count = db.query(CRMTask).filter(CRMTask.status == "Pending", CRMTask.due_date >= today_start, CRMTask.due_date < today_end).count()
    upcoming_count = db.query(CRMTask).filter(CRMTask.status == "Pending", CRMTask.due_date >= today_end).count()
    total_unresolved = db.query(CRMTask).filter(CRMTask.status == "Pending").count()
    
    # Task type breakup for donut chart
    tasks = db.query(CRMTask).filter(CRMTask.status == "Pending").all()
    task_types = {"Call": 0, "Meeting": 0, "Email": 0, "Task": 0}
    for t in tasks:
        if t.type in task_types:
            task_types[t.type] += 1
            
    # 2. Leads stats
    leads = db.query(CRMLead).all()
    lead_status_counts = {
        "Contacted": 0,
        "Interested": 0,
        "Qualified": 0,
        "Converted": 0,
        "Lost": 0
    }
    
    # Count leads received today
    received_today = db.query(CRMLead).filter(CRMLead.created_at >= today_start).count()
    converted_today = db.query(CRMLead).filter(CRMLead.status == "Converted", CRMLead.created_at >= today_start).count()
    total_pending_leads = db.query(CRMLead).filter(CRMLead.status != "Converted", CRMLead.status != "Lost").count()
    
    for l in leads:
        if l.status in lead_status_counts:
            lead_status_counts[l.status] += 1
            
    # Calculate Total Portfolio AUM
    total_aum = db.query(CRMPortfolio).with_entities(CRMPortfolio.current_value).all()
    sum_aum = sum(h[0] for h in total_aum if h[0])
    
    return {
        "tasks": {
            "overdue": overdue_count,
            "due_today": due_today_count,
            "upcoming": upcoming_count,
            "total_unresolved": total_unresolved,
            "breakup": task_types
        },
        "leads": {
            "received_today": received_today,
            "converted_today": converted_today,
            "total_pending": total_pending_leads,
            "breakup": lead_status_counts
        },
        "total_aum": sum_aum,
        "total_clients": db.query(CRMClient).count()
    }

# ─── ADMIN CRM CLIENTS CRUD ──────────────────────────────
@app.get("/api/admin/crm/clients")
async def list_admin_crm_clients(username: str = Depends(authenticate_admin), db: Session = Depends(get_db)):
    clients = db.query(CRMClient).all()
    result = []
    for c in clients:
        # Sum AUM
        portfolio_sum = db.query(CRMPortfolio).filter(CRMPortfolio.client_username == c.username).all()
        aum = sum(h.current_value for h in portfolio_sum if h.current_value)
        result.append({
            "id": c.id,
            "name": c.name,
            "username": c.username,
            "password_raw": c.password_raw,
            "email": c.email,
            "phone": c.phone,
            "pan": c.pan,
            "dob": c.dob,
            "address": c.address,
            "rm_name": c.rm_name,
            "status": c.status,
            "aum": aum,
            "created_at": c.created_at.isoformat()
        })
    return result

@app.post("/api/admin/crm/clients")
async def create_or_update_crm_client(req: CRMClientCreateReq, username: str = Depends(authenticate_admin), db: Session = Depends(get_db)):
    client = db.query(CRMClient).filter(CRMClient.username == req.username).first()
    if client:
        # Update
        client.name = req.name
        client.password_raw = req.password_raw
        client.email = req.email
        client.phone = req.phone
        client.pan = req.pan
        client.dob = req.dob
        client.address = req.address
        client.rm_name = req.rm_name
        client.status = req.status
    else:
        # Create
        client = CRMClient(
            name=req.name,
            username=req.username,
            password_raw=req.password_raw,
            email=req.email,
            phone=req.phone,
            pan=req.pan,
            dob=req.dob,
            address=req.address,
            rm_name=req.rm_name,
            status=req.status
        )
        db.add(client)
    db.commit()
    return {"success": True, "username": client.username}

@app.delete("/api/admin/crm/clients/{client_id}")
async def delete_crm_client(client_id: int, username: str = Depends(authenticate_admin), db: Session = Depends(get_db)):
    client = db.query(CRMClient).filter(CRMClient.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Also clean up their holdings and tasks
    db.query(CRMPortfolio).filter(CRMPortfolio.client_username == client.username).delete()
    db.query(CRMTask).filter(CRMTask.client_username == client.username).delete()
    
    db.delete(client)
    db.commit()
    return {"success": True}

@app.put("/api/admin/crm/clients/{client_id}")
async def update_crm_client(client_id: int, req: CRMClientCreate, username: str = Depends(authenticate_admin), db: Session = Depends(get_db)):
    client = db.query(CRMClient).filter(CRMClient.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Check username uniqueness (if username is being changed)
    if req.username != client.username:
        existing = db.query(CRMClient).filter(CRMClient.username == req.username).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Username '{req.username}' is already taken by another client.")
        
        # Update related holdings/tasks to new username
        db.query(CRMPortfolio).filter(CRMPortfolio.client_username == client.username).update({"client_username": req.username})
        db.query(CRMTask).filter(CRMTask.client_username == client.username).update({"client_username": req.username})

    client.name = req.name
    client.username = req.username
    client.password_raw = req.password_raw
    client.email = req.email
    client.phone = req.phone
    client.pan = req.pan or ""
    client.dob = req.dob or ""
    client.address = req.address or ""
    client.rm_name = req.rm_name or "Adviser RM"
    client.status = req.status or "Active"
    db.commit()
    return {"success": True, "username": client.username}

@app.get("/api/admin/crm/clients/{client_username}/details")
async def get_crm_client_details(client_username: str, username: str = Depends(authenticate_admin), db: Session = Depends(get_db)):
    client = db.query(CRMClient).filter(CRMClient.username == client_username).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    holdings = db.query(CRMPortfolio).filter(CRMPortfolio.client_username == client_username).all()
    tasks = db.query(CRMTask).filter(CRMTask.client_username == client_username).all()
    
    formatted_tasks = []
    for t in tasks:
        formatted_tasks.append({
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "type": t.type,
            "status": t.status,
            "due_date": t.due_date.isoformat() if t.due_date else None,
            "created_at": t.created_at.isoformat()
        })
        
    return {
        "holdings": [{
            "id": h.id,
            "scheme_name": h.scheme_name,
            "folio_number": h.folio_number,
            "units": h.units,
            "purchase_price": h.purchase_price,
            "current_nav": h.current_nav,
            "current_value": h.current_value,
            "asset_class": h.asset_class,
            "updated_at": h.updated_at.isoformat()
        } for h in holdings],
        "tasks": formatted_tasks
    }

# ─── ADMIN CRM HOLDINGS CRUD ────────────────────────────
@app.post("/api/admin/crm/clients/{client_username}/holdings")
async def add_or_update_crm_holding(client_username: str, req: CRMPortfolioReq, username: str = Depends(authenticate_admin), db: Session = Depends(get_db)):
    # Calculate current value
    val = req.units * req.current_nav
    holding = CRMPortfolio(
        client_username=client_username,
        scheme_name=req.scheme_name,
        folio_number=req.folio_number,
        units=req.units,
        purchase_price=req.purchase_price,
        current_nav=req.current_nav,
        current_value=val,
        asset_class=req.asset_class
    )
    db.add(holding)
    db.commit()
    return {"success": True, "id": holding.id}

@app.delete("/api/admin/crm/clients/holdings/{holding_id}")
async def delete_crm_holding(holding_id: int, username: str = Depends(authenticate_admin), db: Session = Depends(get_db)):
    holding = db.query(CRMPortfolio).filter(CRMPortfolio.id == holding_id).first()
    if not holding:
        raise HTTPException(status_code=404, detail="Holding record not found")
    db.delete(holding)
    db.commit()
    return {"success": True}

# ─── ADMIN CRM TASKS CRUD ───────────────────────────────
@app.post("/api/admin/crm/clients/{client_username}/tasks")
async def add_crm_task(client_username: str, req: CRMTaskReq, username: str = Depends(authenticate_admin), db: Session = Depends(get_db)):
    due = None
    if req.due_date:
        try:
            # Parse ISO string
            due = datetime.datetime.fromisoformat(req.due_date.replace("Z", ""))
        except Exception:
            pass
            
    task = CRMTask(
        client_username=client_username,
        title=req.title,
        description=req.description or "",
        type=req.type or "Call",
        status=req.status or "Pending",
        due_date=due
    )
    db.add(task)
    db.commit()
    return {"success": True, "id": task.id}

@app.post("/api/admin/crm/tasks/{task_id}/toggle")
async def toggle_crm_task_status(task_id: int, username: str = Depends(authenticate_admin), db: Session = Depends(get_db)):
    task = db.query(CRMTask).filter(CRMTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.status = "Completed" if task.status == "Pending" else "Pending"
    db.commit()
    return {"success": True, "new_status": task.status}

@app.delete("/api/admin/crm/tasks/{task_id}")
async def delete_crm_task(task_id: int, username: str = Depends(authenticate_admin), db: Session = Depends(get_db)):
    task = db.query(CRMTask).filter(CRMTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"success": True}

# ─── ADMIN CRM LEADS CRUD ───────────────────────────────
@app.get("/api/admin/crm/leads")
async def list_admin_crm_leads(username: str = Depends(authenticate_admin), db: Session = Depends(get_db)):
    leads = db.query(CRMLead).order_by(CRMLead.created_at.desc()).all()
    return [{
        "id": l.id,
        "name": l.name,
        "email": l.email,
        "phone": l.phone,
        "source": l.source,
        "status": l.status,
        "remarks": l.remarks,
        "created_at": l.created_at.isoformat()
    } for l in leads]

@app.post("/api/admin/crm/leads")
async def create_or_update_crm_lead(req: CRMLeadReq, lead_id: Optional[int] = None, username: str = Depends(authenticate_admin), db: Session = Depends(get_db)):
    if lead_id:
        lead = db.query(CRMLead).filter(CRMLead.id == lead_id).first()
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        lead.name = req.name
        lead.email = req.email
        lead.phone = req.phone
        lead.source = req.source
        lead.status = req.status
        lead.remarks = req.remarks
    else:
        lead = CRMLead(
            name=req.name,
            email=req.email,
            phone=req.phone,
            source=req.source,
            status=req.status,
            remarks=req.remarks
        )
        db.add(lead)
    db.commit()
    return {"success": True, "id": lead.id}

@app.delete("/api/admin/crm/leads/{lead_id}")
async def delete_crm_lead(lead_id: int, username: str = Depends(authenticate_admin), db: Session = Depends(get_db)):
    lead = db.query(CRMLead).filter(CRMLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    db.delete(lead)
    db.commit()
    return {"success": True}


@app.on_event("startup")
async def startup_event():
    asyncio.create_task(webinar_reminder_daemon())
    print("[STARTUP] Webinar reminder daemon scheduled.")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
