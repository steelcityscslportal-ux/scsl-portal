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

class HomepageContent(Base):
    __tablename__ = "homepage_contents"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(Text)

# ─── CRM MODELS ──────────────────────────────────────────
class CRMClient(Base):
    __tablename__ = "crm_clients"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    username = Column(String, unique=True, index=True)
    password_raw = Column(String)  # Stored so admin/user can view/manage
    email = Column(String, index=True)
    phone = Column(String)
    pan = Column(String, default="")
    dob = Column(String, default="")
    address = Column(Text, default="")
    rm_name = Column(String, default="Adviser RM")
    status = Column(String, default="Active")  # "Active" or "Deactivated"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class CRMPortfolio(Base):
    __tablename__ = "crm_portfolios"
    id = Column(Integer, primary_key=True, index=True)
    client_username = Column(String, index=True)
    scheme_name = Column(String)
    folio_number = Column(String, default="")
    units = Column(Float, default=0.0)
    purchase_price = Column(Float, default=0.0)
    current_nav = Column(Float, default=0.0)
    current_value = Column(Float, default=0.0)
    asset_class = Column(String, default="Equity")  # Equity, Debt, Hybrid, Gold, Cash
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

class CRMTask(Base):
    __tablename__ = "crm_tasks"
    id = Column(Integer, primary_key=True, index=True)
    client_username = Column(String, index=True)
    title = Column(String)
    description = Column(Text, default="")
    type = Column(String, default="Call")  # Call, Meeting, Email, Task
    status = Column(String, default="Pending")  # Pending, Completed
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class CRMLead(Base):
    __tablename__ = "crm_leads"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String)
    phone = Column(String)
    source = Column(String, default="Website")  # Website, Walk-in, Referral, Cold Call
    status = Column(String, default="Contacted")  # Contacted, Interested, Qualified, Converted, Lost
    remarks = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

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

def seed_crm_data():
    db = SessionLocal()
    try:
        # Import models here to be safe
        from database import CRMClient, CRMPortfolio, CRMTask, CRMLead
        
        if db.query(CRMClient).count() == 0:
            print("[SEED] Seeding CRM demo data...")
            
            # 1. Seed CRM Clients
            clients = [
                CRMClient(
                    name="Aalok Soni", username="user1", password_raw="pass123",
                    email="aaloksoni@gmail.com", phone="9876543210", pan="STFPS7351A",
                    dob="1990-03-13", address="Khapia, Keredari", rm_name="mukeshrm", status="Active"
                ),
                CRMClient(
                    name="Aamir Singh", username="user2", password_raw="pass123",
                    email="aamir.singh@gmail.com", phone="9876543222", pan="AAKPS7687R",
                    dob="1985-06-15", address="GURGAON Sector 45", rm_name="mukeshrm", status="Active"
                ),
                CRMClient(
                    name="Aanchal Gupta", username="user3", password_raw="pass123",
                    email="aanchal.gupta@gmail.com", phone="9876543333", pan="AAQWW6789K",
                    dob="1992-12-08", address="Delhi Connaught Place", rm_name="ROHIT", status="Active"
                )
            ]
            for c in clients:
                db.add(c)
            db.commit()
            
            # 2. Seed Portfolios
            portfolios = [
                # Aalok Soni (user1)
                CRMPortfolio(client_username="user1", scheme_name="HDFC Mid-Cap Opportunities Fund", folio_number="1278485", units=1254.5, purchase_price=120.5, current_nav=145.8, current_value=182906.1, asset_class="Equity"),
                CRMPortfolio(client_username="user1", scheme_name="SBI Bluechip Fund - Direct", folio_number="1278485", units=850.0, purchase_price=65.2, current_nav=82.4, current_value=70040.0, asset_class="Equity"),
                CRMPortfolio(client_username="user1", scheme_name="Nippon India Liquid Fund", folio_number="1278485", units=50.0, purchase_price=2000.0, current_nav=2250.0, current_value=112500.0, asset_class="Cash"),
                CRMPortfolio(client_username="user1", scheme_name="ICICI Prudential Bond Fund", folio_number="1278485", units=1500.0, purchase_price=12.4, current_nav=13.8, current_value=20700.0, asset_class="Debt"),
                # Aamir Singh (user2)
                CRMPortfolio(client_username="user2", scheme_name="HDFC Mid-Cap Opportunities Fund", folio_number="992288", units=500.0, purchase_price=120.5, current_nav=145.8, current_value=72900.0, asset_class="Equity"),
                CRMPortfolio(client_username="user2", scheme_name="Axis Small Cap Fund", folio_number="992288", units=350.0, purchase_price=55.0, current_nav=77.4, current_value=27090.0, asset_class="Equity"),
                # Aanchal Gupta (user3)
                CRMPortfolio(client_username="user3", scheme_name="Parag Parikh Flexi Cap Fund", folio_number="883311", units=1200.0, purchase_price=45.0, current_nav=68.2, current_value=81840.0, asset_class="Equity")
            ]
            for p in portfolios:
                db.add(p)
            db.commit()

            # 3. Seed CRM Tasks / Follow-ups
            now = datetime.datetime.utcnow()
            tasks = [
                CRMTask(client_username="user1", title="Portfolio Annual Review", description="Discuss asset rebalancing and new SIP goals", type="Meeting", status="Pending", due_date=now - datetime.timedelta(days=2)), # Overdue
                CRMTask(client_username="user1", title="Follow up on KYC Documents", description="Collect PAN and Address proof copy", type="Call", status="Pending", due_date=now - datetime.timedelta(days=1)), # Overdue
                CRMTask(client_username="user1", title="Send Mutual Fund Factsheets", description="Send factsheets of Mid-cap schemes via email", type="Email", status="Pending", due_date=now), # Due today
                CRMTask(client_username="user2", title="Introduction Call with Adviser", description="Welcome call to new investor", type="Call", status="Completed", due_date=now - datetime.timedelta(days=5)),
                CRMTask(client_username="user2", title="NPS Account Advisory", description="Explain tax saving benefits of NPS scheme", type="Meeting", status="Pending", due_date=now + datetime.timedelta(days=3)), # Upcoming
                CRMTask(client_username="user3", title="Review Risk Profile Questionnaire", description="Complete risk profiling form", type="Task", status="Pending", due_date=now + datetime.timedelta(days=5)) # Upcoming
            ]
            for t in tasks:
                db.add(t)
            db.commit()

            # 4. Seed CRM Leads
            leads = [
                CRMLead(name="Rohan Sharma", email="rohan@gmail.com", phone="9988776655", source="Website", status="Contacted", remarks="Interested in Mutual Fund SIP"),
                CRMLead(name="Priya Patel", email="priya@gmail.com", phone="9988776611", source="Referral", status="Interested", remarks="Wants to invest 5 Lacs lump sum"),
                CRMLead(name="Sandeep Kumar", email="sandeep@gmail.com", phone="9988776622", source="Cold Call", status="Qualified", remarks="High net worth individual, looking for PMS"),
                CRMLead(name="Vikram Singh", email="vikram@gmail.com", phone="9988776633", source="Walk-in", status="Converted", remarks="Opened trading and demat account"),
                CRMLead(name="Neha Gupta", email="neha@gmail.com", phone="9988776644", source="Website", status="Lost", remarks="Decided to invest with another broker"),
                CRMLead(name="Amit Verma", email="amit@gmail.com", phone="9988776666", source="Website", status="Contacted", remarks="Inquired about webinars"),
                CRMLead(name="Shweta Shah", email="shweta@gmail.com", phone="9988776677", source="Referral", status="Interested", remarks="Wants retirement planning advice"),
                CRMLead(name="Rajesh Rao", email="rajesh@gmail.com", phone="9988776688", source="Cold Call", status="Contacted", remarks="Will callback next week"),
                CRMLead(name="Anjali Joshi", email="anjali@gmail.com", phone="9988776699", source="Website", status="Qualified", remarks="KYC verified, planning first trade"),
                CRMLead(name="Deepak Mishra", email="deepak@gmail.com", phone="9988776600", source="Walk-in", status="Converted", remarks="Started SIP of 25,000/month")
            ]
            for l in leads:
                db.add(l)
            db.commit()
            print("[SEED] CRM demo data seeded successfully.")
    except Exception as e:
        print(f"[SEED] Error seeding CRM data: {e}")
    finally:
        db.close()

seed_crm_data()

