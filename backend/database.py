from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Boolean, Float
from sqlalchemy.orm import declarative_base, sessionmaker
import datetime
import os

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./leads.db")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Contact(Base):
    __tablename__ = "contacts"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, index=True)
    phone = Column(String)
    message = Column(Text)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class Registration(Base):
    __tablename__ = "registrations"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String)
    phone = Column(String)
    webinar_id = Column(Integer)
    topic = Column(String)
    date = Column(String)
    payment_utr = Column(String, default="")        # Transaction UTR/reference
    payment_status = Column(String, default="free") # "free", "paid", "pending"
    fee_paid = Column(Float, default=0.0)           # Amount paid
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)


class PageView(Base):
    __tablename__ = "page_views"
    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String)
    user_agent = Column(String)
    browser = Column(String)
    os = Column(String)
    device = Column(String)
    page_url = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class AdminLogin(Base):
    __tablename__ = "admin_logins"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String)
    ip_address = Column(String)
    status = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class AccountOpening(Base):
    __tablename__ = "account_openings"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, index=True)
    phone = Column(String)
    pan = Column(String)
    aadhaar = Column(String)
    dob = Column(String)
    state = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class Webinar(Base):
    __tablename__ = "webinars"
    id = Column(Integer, primary_key=True, index=True)
    trainer = Column(String)
    region = Column(String)
    date = Column(String)
    day = Column(String)
    time = Column(String)
    topic = Column(String)
    mode = Column(String, default="Online")
    seats = Column(Integer, default=200)
    link = Column(String, default="")
    avatar_url = Column(String, default="/host2.png")
    # Payment fields
    is_paid = Column(Boolean, default=False)
    fee_amount = Column(Float, default=0.0)
    payment_utr_required = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

Base.metadata.create_all(bind=engine)

