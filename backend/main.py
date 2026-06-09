from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
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
from sqlalchemy.orm import Session
from database import SessionLocal, Contact, Registration, PageView, AdminLogin, AccountOpening
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
async def get_leads(db: Session = Depends(get_db)):
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
async def delete_lead(req: DeleteRequest, db: Session = Depends(get_db)):
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
        "brevo_key_prefix": BREVO_API_KEY[:10] if BREVO_API_KEY else "",
        "sender_email": SMTP_EMAIL,
        "last_otp_error": last_otp_error
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
