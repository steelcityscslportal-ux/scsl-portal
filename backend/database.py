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
    reminder_sent = Column(Boolean, default=False)
    reminder_sent_at = Column(DateTime, nullable=True)
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
    start_time = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Feedback(Base):
    __tablename__ = "feedbacks"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String)
    rating = Column(Integer)
    comment = Column(Text)
    is_approved = Column(Boolean, default=False)  # Hidden until admin approves
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class AdminUser(Base):
    __tablename__ = "admin_users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String, default="supervisor") # "admin" or "supervisor"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class SystemSetting(Base):
    __tablename__ = "system_settings"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(String)

Base.metadata.create_all(bind=engine)

def run_migrations():
    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            is_sqlite = "sqlite" in str(engine.url)
            if is_sqlite:
                # SQLite ALTER TABLE doesn't support IF NOT EXISTS
                cols = [
                    ("webinars", "is_paid", "BOOLEAN DEFAULT 0"),
                    ("webinars", "fee_amount", "REAL DEFAULT 0.0"),
                    ("webinars", "payment_utr_required", "BOOLEAN DEFAULT 1"),
                    ("webinars", "start_time", "DATETIME"),
                    ("registrations", "payment_utr", "TEXT DEFAULT ''"),
                    ("registrations", "payment_status", "TEXT DEFAULT 'free'"),
                    ("registrations", "fee_paid", "REAL DEFAULT 0.0"),
                    ("registrations", "reminder_sent", "BOOLEAN DEFAULT 0"),
                    ("registrations", "reminder_sent_at", "DATETIME")
                ]
                for table, col, definition in cols:
                    try:
                        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {definition}"))
                        print(f"[MIGRATION] Added column {col} to {table}")
                    except Exception:
                        pass
            else:
                # PostgreSQL ALTER TABLE supports IF NOT EXISTS
                statements = [
                    "ALTER TABLE webinars ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;",
                    "ALTER TABLE webinars ADD COLUMN IF NOT EXISTS fee_amount DOUBLE PRECISION DEFAULT 0.0;",
                    "ALTER TABLE webinars ADD COLUMN IF NOT EXISTS payment_utr_required BOOLEAN DEFAULT TRUE;",
                    "ALTER TABLE webinars ADD COLUMN IF NOT EXISTS start_time TIMESTAMP;",
                    "ALTER TABLE registrations ADD COLUMN IF NOT EXISTS payment_utr VARCHAR(255) DEFAULT '';",
                    "ALTER TABLE registrations ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'free';",
                    "ALTER TABLE registrations ADD COLUMN IF NOT EXISTS fee_paid DOUBLE PRECISION DEFAULT 0.0;",
                    "ALTER TABLE registrations ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;",
                    "ALTER TABLE registrations ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP;"
                ]
                for stmt in statements:
                    try:
                        conn.execute(text(stmt))
                        print(f"[MIGRATION] Ran: {stmt}")
                    except Exception as e:
                        print(f"[MIGRATION] Error executing migration statement: {e}")
    except Exception as e:
        print(f"[MIGRATION] Error during startup migrations: {e}")

run_migrations()

def seed_admin_user():
    import hashlib
    db = SessionLocal()
    try:
        if db.query(AdminUser).count() == 0:
            default_pwd = "scsladmin123"
            pwd_hash = hashlib.sha256(default_pwd.encode()).hexdigest()
            admin = AdminUser(username="admin", password_hash=pwd_hash, role="admin")
            db.add(admin)
            db.commit()
            print("[SEED] Default admin user seeded successfully.")
    except Exception as e:
        print(f"[SEED] Error seeding admin user: {e}")
    finally:
        db.close()

seed_admin_user()

