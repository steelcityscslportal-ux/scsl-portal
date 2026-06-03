from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import sqlite3
import os
import random

app = FastAPI(title="SCSL Portal API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Database Path and Setup ─────────────────────
DB_PATH = os.path.join(os.path.dirname(__file__), "leads.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Table for contact inquiries
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            message TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Table for webinar registrations
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS registrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            webinar_id INTEGER,
            topic TEXT,
            date TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

# Initialize DB on startup
init_db()

# ─── Models ───────────────────────────────────────
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
    """Simulate small realistic price movements"""
    volatility = base * 0.005  # 0.5% volatility
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

# ─── Routes ───────────────────────────────────────

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

@app.post("/api/contact")
async def submit_contact(lead: ContactLead):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO contacts (name, email, phone, message) VALUES (?, ?, ?, ?)",
        (lead.name, lead.email, lead.phone, lead.message)
    )
    conn.commit()
    conn.close()
    return {"success": True, "message": f"Thank you {lead.name}! Our team will contact you within 24 hours."}

@app.post("/api/register/request-otp")
async def request_otp(req: OTPRequest):
    # In a real app, this would integrate with an SMS provider like Twilio
    print(f"[OTP SERVICE] Sending OTP '1234' to {req.phone}")
    return {"success": True, "message": "OTP sent successfully"}

@app.post("/api/register")
async def register_webinar(reg: WebinarRegistration):
    if reg.otp != "1234":
        raise HTTPException(status_code=400, detail="Invalid OTP. Please use 1234.")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO registrations (name, email, phone, webinar_id, topic, date) VALUES (?, ?, ?, ?, ?, ?)",
        (reg.name, reg.email, reg.phone, reg.webinar_id, reg.topic, reg.date)
    )
    conn.commit()
    conn.close()
    return {"success": True, "message": f"Successfully registered for: {reg.topic}!"}

@app.get("/api/leads")
async def get_leads():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Fetch contacts
    cursor.execute("SELECT * FROM contacts ORDER BY timestamp DESC")
    contacts = [dict(row) for row in cursor.fetchall()]
    
    # Fetch registrations
    cursor.execute("SELECT * FROM registrations ORDER BY timestamp DESC")
    registrations = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    return {
        "contacts": contacts,
        "registrations": registrations
    }

@app.delete("/api/leads/delete")
async def delete_lead(req: DeleteRequest):
    table = "contacts" if req.type == "contact" else "registrations"
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(f"DELETE FROM {table} WHERE id = ?", (req.id,))
    conn.commit()
    conn.close()
    return {"success": True, "message": f"Deleted entry from {req.type}."}

@app.get("/api/health")
async def health():
    return {"status": "healthy", "service": "SCSL Portal API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
