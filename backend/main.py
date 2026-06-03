from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import random
from sqlalchemy.orm import Session
from database import SessionLocal, Contact, Registration, PageView, AdminLogin
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
    phone: str

class DeleteRequest(BaseModel):
    type: str  # "contact" or "registration"
    id: int

class PageViewReq(BaseModel):
    page_url: str

class LoginReq(BaseModel):
    username: str
    status: str

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
    print(f"[OTP SERVICE] Sending OTP '1234' to {req.phone}")
    return {"success": True, "message": "OTP sent successfully"}

@app.post("/api/register")
async def register_webinar(reg: WebinarRegistration, db: Session = Depends(get_db)):
    if reg.otp != "1234":
        raise HTTPException(status_code=400, detail="Invalid OTP. Please use 1234.")
    registration = Registration(
        name=reg.name, email=reg.email, phone=reg.phone, 
        webinar_id=reg.webinar_id, topic=reg.topic, date=reg.date
    )
    db.add(registration)
    db.commit()
    return {"success": True, "message": f"Successfully registered for: {reg.topic}!"}

@app.get("/api/leads")
async def get_leads(db: Session = Depends(get_db)):
    contacts = db.query(Contact).order_by(Contact.timestamp.desc()).all()
    registrations = db.query(Registration).order_by(Registration.timestamp.desc()).all()
    page_views = db.query(PageView).order_by(PageView.timestamp.desc()).all()
    logins = db.query(AdminLogin).order_by(AdminLogin.timestamp.desc()).all()
    
    return {
        "contacts": contacts,
        "registrations": registrations,
        "page_views": page_views,
        "logins": logins
    }

@app.delete("/api/leads/delete")
async def delete_lead(req: DeleteRequest, db: Session = Depends(get_db)):
    if req.type == "contact":
        item = db.query(Contact).filter(Contact.id == req.id).first()
    else:
        item = db.query(Registration).filter(Registration.id == req.id).first()
        
    if item:
        db.delete(item)
        db.commit()
    return {"success": True, "message": f"Deleted entry from {req.type}."}

@app.get("/api/health")
async def health():
    return {"status": "healthy", "service": "SCSL Portal API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
