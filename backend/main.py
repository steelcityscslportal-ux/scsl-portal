from fastapi import FastAPI, HTTPException, Request, Depends
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
from sqlalchemy.orm import Session
from database import SessionLocal, Contact, Registration, PageView, AdminLogin, AccountOpening, Webinar
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

# ─── OTP Store (in-memory, email -> {otp, timestamp}) ────
otp_store = {}
OTP_EXPIRY_SECONDS = 600  # 10 minutes

# ─── SMTP & Brevo Configuration ──────────────────────────
SMTP_EMAIL = os.environ.get("SMTP_EMAIL", "steelcityscslportal@gmail.com")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "nwgg kbty ngbo lcvc")
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
BREVO_API_KEY = os.environ.get("BREVO_API_KEY", "").strip()
last_otp_error = "None"

# ─── Admin Authentication Configuration ───────────────────
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "scsladmin123")
security = HTTPBasic()

def authenticate_admin(request: Request, credentials: HTTPBasicCredentials = Depends(security), db: Session = Depends(get_db)):
    correct_username = secrets.compare_digest(credentials.username, ADMIN_USERNAME)
    correct_password = secrets.compare_digest(credentials.password, ADMIN_PASSWORD)
    
    status = "SUCCESS" if (correct_username and correct_password) else "FAILED"
    ip = request.client.host
    
    # Save the login attempt to the database for audit logs
    login_log = AdminLogin(username=credentials.username, ip_address=ip, status=status)
    db.add(login_log)
    db.commit()
    
    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

def generate_otp():
    """Generate a unique 6-digit OTP"""
    return str(random.randint(100000, 999999))

def send_otp_email_brevo(to_email: str, otp_code: str, html_content: str):
    """Send OTP email using Brevo's HTTP API over port 443"""
    global last_otp_error
    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
        "accept": "application/json"
    }
    payload = {
        "sender": {"name": "Steel City Securities", "email": SMTP_EMAIL},
        "to": [{"email": to_email}],
        "subject": "Your SCSL Webinar Registration OTP",
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
            print(f"[OTP SERVICE] Email sent successfully to {to_email} via Brevo API: {res_body}")
            return True
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        msg = f"HTTP Error {e.code}: {error_body}"
        print(f"[OTP SERVICE] Failed to send email via Brevo API: {msg}")
        last_otp_error = msg
        return False
    except Exception as e:
        msg = f"Error: {e}"
        print(f"[OTP SERVICE] Failed to send email via Brevo API: {msg}")
        last_otp_error = msg
        return False

def send_registration_confirmation_email(to_email: str, to_name: str, topic: str, date: str, time_str: str, link: str):
    """Send a webinar registration confirmation email via Brevo API."""
    join_section = f"""
        <div style="background: #e8f0fe; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;">
            <p style="margin: 0 0 8px; font-size: 14px; color: #333;">Join the session here:</p>
            <a href="{link}" style="color: #0077B6; font-weight: bold; word-break: break-all;">{link}</a>
        </div>""" if link else ""

    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
        <div style="max-width: 520px; margin: 0 auto; background: #f8f9fa; border-radius: 12px; padding: 30px; border: 1px solid #e0e0e0;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #0a1628; margin: 0;">Steel City Securities</h2>
                <p style="color: #666; font-size: 14px;">Webinar Registration Confirmed ✅</p>
            </div>
            <p style="color: #333;">Dear <strong>{to_name}</strong>,</p>
            <p style="color: #555;">You have successfully registered for the following webinar:</p>
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 16px 0; border-left: 4px solid #0077B6;">
                <p style="margin: 4px 0;"><strong>Topic:</strong> {topic}</p>
                <p style="margin: 4px 0;"><strong>Date:</strong> {date}</p>
                <p style="margin: 4px 0;"><strong>Time:</strong> {time_str}</p>
            </div>
            {join_section}
            <p style="color: #888; font-size: 12px; text-align: center;">If you did not register, please ignore this email.</p>
        </div>
    </body>
    </html>
    """
    return send_otp_email_brevo(to_email, "", html)

def send_otp_email(to_email: str, otp_code: str):
    """Send OTP to user's email via Brevo API or fallback to SMTP"""
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

    if BREVO_API_KEY:
        return send_otp_email_brevo(to_email, otp_code, html)
        
    if not SMTP_PASSWORD:
        print(f"[OTP SERVICE] SMTP not configured. OTP for {to_email}: {otp_code}")
        return True
    
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Your SCSL Webinar Registration OTP"
        msg["From"] = f"Steel City Securities <{SMTP_EMAIL}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, to_email, msg.as_string())
        
        print(f"[OTP SERVICE] Email sent successfully to {to_email}")
        return True
    except Exception as e:
        print(f"[OTP SERVICE] Failed to send email: {e}")
        return False

def send_registration_confirmation_email(to_email: str, to_name: str, topic: str, date: str, time_str: str, link: str):
    """Send a beautiful registration confirmation email with meeting link and timing"""
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
                
                {f'''
                <div style="text-align: center; margin: 30px 0 20px 0;">
                    <a href="{link}" target="_blank" style="background: #0077B6; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px rgba(0,119,182,0.25);">
                        Join Live Meeting
                    </a>
                    <p style="margin: 12px 0 0 0; font-size: 12px; color: #666; word-break: break-all;">
                        Or copy-paste this URL: <br/>
                        <a href="{link}" style="color: #0077B6;">{link}</a>
                    </p>
                </div>
                ''' if link else '''
                <div style="background: #fff9db; border-radius: 8px; padding: 12px; border: 1px solid #ffe3e3; margin: 20px 0; font-size: 13px; color: #b07a00; text-align: center;">
                    ⚠️ The meeting link will be sent to you prior to the session start.
                </div>
                '''}
                
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
    
    if BREVO_API_KEY:
        url = "https://api.brevo.com/v3/smtp/email"
        headers = {
            "api-key": BREVO_API_KEY,
            "content-type": "application/json",
            "accept": "application/json"
        }
        payload = {
            "sender": {"name": "Steel City Securities", "email": SMTP_EMAIL},
            "to": [{"email": to_email}],
            "subject": f"Webinar Registration Confirmed: {topic}",
            "htmlContent": html
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
                print(f"[REGISTRATION SERVICE] Email sent successfully to {to_email} via Brevo API: {res_body}")
                return True
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8")
            print(f"[REGISTRATION SERVICE] Failed to send email via Brevo API: HTTP {e.code}: {error_body}")
            return False
        except Exception as e:
            print(f"[REGISTRATION SERVICE] Failed to send email via Brevo API: {e}")
            return False
            
    if not SMTP_PASSWORD:
        print(f"[REGISTRATION SERVICE] SMTP not configured. Confirmation for {to_email} to topic '{topic}' not sent.")
        return True
        
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Webinar Registration Confirmed: {topic}"
        msg["From"] = f"Steel City Securities <{SMTP_EMAIL}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, to_email, msg.as_string())
        
        print(f"[REGISTRATION SERVICE] Email sent successfully to {to_email}")
        return True
    except Exception as e:
        print(f"[REGISTRATION SERVICE] Failed to send email: {e}")
        return False

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

@app.post("/api/webinars/save")
async def save_webinar(req: WebinarSaveReq, username: str = Depends(authenticate_admin), db: Session = Depends(get_db)):
    if req.id:
        w = db.query(Webinar).filter(Webinar.id == req.id).first()
        if not w:
            raise HTTPException(status_code=404, detail="Webinar not found")
        w.trainer    = req.trainer
        w.region     = req.region
        w.date       = req.date
        w.day        = req.day
        w.time       = req.time
        w.topic      = req.topic
        w.mode       = req.mode
        w.seats      = req.seats
        w.link       = req.link
        w.avatar_url = req.avatar_url
    else:
        w = Webinar(
            trainer=req.trainer, region=req.region, date=req.date,
            day=req.day, time=req.time, topic=req.topic, mode=req.mode,
            seats=req.seats, link=req.link, avatar_url=req.avatar_url
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
async def request_otp(req: OTPRequest):
    email = req.email.strip().lower()
    otp_code = generate_otp()
    
    # Store OTP with timestamp
    otp_store[email] = {"otp": otp_code, "timestamp": time.time()}
    
    # Send OTP via email
    sent = send_otp_email(email, otp_code)
    
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
    
    registration = Registration(
        name=reg.name, email=reg.email, phone=reg.phone, 
        webinar_id=reg.webinar_id, topic=reg.topic, date=reg.date
    )
    db.add(registration)
    db.commit()

    # Send confirmation email (best-effort — don't fail registration if email fails)
    try:
        webinar = db.query(Webinar).filter(Webinar.id == reg.webinar_id).first()
        join_link = webinar.link if webinar and webinar.link else ""
        time_str  = webinar.time if webinar else reg.date
        send_registration_confirmation_email(
            to_email=reg.email,
            to_name=reg.name,
            topic=reg.topic,
            date=reg.date,
            time_str=time_str,
            link=join_link
        )
    except Exception as e:
        print(f"[CONFIRM EMAIL] Failed to send confirmation to {reg.email}: {e}")

    return {"success": True, "message": f"Successfully registered for: {reg.topic}!"}

@app.post("/api/open-account")
async def open_account(req: AccountOpeningReq, db: Session = Depends(get_db)):
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
    return {"success": True, "message": "Your account opening request has been submitted successfully!"}

@app.get("/api/leads")
async def get_leads(username: str = Depends(authenticate_admin), db: Session = Depends(get_db)):
    contacts = db.query(Contact).order_by(Contact.timestamp.desc()).all()
    registrations = db.query(Registration).order_by(Registration.timestamp.desc()).all()
    page_views = db.query(PageView).order_by(PageView.timestamp.desc()).all()
    logins = db.query(AdminLogin).order_by(AdminLogin.timestamp.desc()).all()
    account_openings = db.query(AccountOpening).order_by(AccountOpening.timestamp.desc()).all()
    
    return {
        "contacts": contacts,
        "registrations": registrations,
        "page_views": page_views,
        "logins": logins,
        "account_openings": account_openings
    }

@app.delete("/api/leads/delete")
async def delete_lead(req: DeleteRequest, username: str = Depends(authenticate_admin), db: Session = Depends(get_db)):
    if req.type == "contact":
        item = db.query(Contact).filter(Contact.id == req.id).first()
    elif req.type == "registration":
        item = db.query(Registration).filter(Registration.id == req.id).first()
    elif req.type == "account":
        item = db.query(AccountOpening).filter(AccountOpening.id == req.id).first()
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
async def diag():
    return {
        "has_brevo_key": bool(BREVO_API_KEY),
        "brevo_key_len": len(BREVO_API_KEY) if BREVO_API_KEY else 0,
        "sender_email": SMTP_EMAIL,
        "last_otp_error": last_otp_error
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
