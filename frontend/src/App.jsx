import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, ShieldCheck, UserPlus, Globe, PhoneCall,
  ChevronRight, TrendingUp, Award, Mail, MapPin,
  Menu, X, ArrowRight, CheckCircle, Star,
  Landmark, Coins, PiggyBank, Calendar, Users, Video,
  Briefcase, Rocket, UserCheck, FileText, Laptop,
  CreditCard, Activity, Search, Network, GraduationCap,
  Home, BookOpen, Shield
} from 'lucide-react';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:8000' 
    : 'https://scsl-backend.onrender.com');

/* ═══════════════════════════════════════════════
   1. MARKET WATCH TICKER
   Updates every few seconds with realistic pricing
   ═══════════════════════════════════════════════ */
function MarketTicker() {
  const [data, setData] = useState([
    { symbol: 'NIFTY 50',   price: '22,450.75', change: '+125.30', pct: '+0.56%', up: true },
    { symbol: 'SENSEX',     price: '73,850.40', change: '+410.15', pct: '+0.56%', up: true },
    { symbol: 'BANK NIFTY', price: '48,312.60', change: '+287.90', pct: '+0.60%', up: true },
    { symbol: 'SCSL',       price: '450.25',   change: '+12.50',  pct: '+2.85%', up: true },
    { symbol: 'USD/INR',    price: '83.15',     change: '-0.05',   pct: '-0.06%', up: false },
    { symbol: 'GOLD MCX',   price: '71,240.00',    change: '-120.00', pct: '-0.17%', up: false },
    { symbol: 'CRUDE OIL',  price: '6,512.00',     change: '+45.00',  pct: '+0.69%', up: true },
  ]);

  useEffect(() => {
    const fetchMarket = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/market-watch`);
        if (res.ok) {
          const result = await res.json();
          // Map to match structure
          const formatted = result.map(item => ({
            symbol: item.symbol,
            price: item.price,
            change: item.change,
            pct: item.percent,
            up: item.up
          }));
          setData(formatted);
        }
      } catch (err) {
        // Fallback to static simulation if backend not running/cors
        setData(prev => prev.map(item => {
          const val = parseFloat(item.price.replace(/,/g, ''));
          const vol = val * 0.002;
          const delta = (Math.random() - 0.5) * vol;
          const newVal = val + delta;
          const pct = (delta / val) * 100;
          return {
            ...item,
            price: newVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            change: (delta >= 0 ? '+' : '') + delta.toFixed(2),
            pct: (delta >= 0 ? '+' : '') + pct.toFixed(2) + '%',
            up: delta >= 0
          };
        }));
      }
    };

    const interval = setInterval(fetchMarket, 4000);
    return () => clearInterval(interval);
  }, []);

  const items = [...data, ...data];
  return (
    <div className="ticker-bar">
      <div className="ticker-label"><TrendingUp size={14} /><span>LIVE MARKET</span></div>
      <div className="ticker-wrap">
        <div className="ticker-inner">
          {items.map((d, i) => (
            <span key={i} className={`tick-item ${d.up ? 'up' : 'down'}`}>
              <span className="tick-sym">{d.symbol}</span>
              <span className="tick-price">{d.price}</span>
              <span className="tick-chg">{d.change} ({d.pct})</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   2. NAVBAR
   ═══════════════════════════════════════════════ */
const navItems = [
  { label: 'Home', href: '#home' },
  { label: 'Webinars', href: '#webinars' },
  { label: 'Services', href: '#services' },
  { label: 'Services Hub', href: '#hub' },
  { label: 'Journey', href: '#journey' },
  { label: 'About Us', href: '#about' },
  { label: 'Contact', href: '#contact' },
];

function Navbar({ activePage, onOpenAccountClick }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="container nav-inner">
        <a href="#home" className="logo">
          <img src="https://www.steelcitynettrade.com/images/Steelcity-logo.png" alt="Steel City Logo" style={{ height: '40px' }} />
        </a>
        <nav className="nav-links">
          {navItems.map(n => {
            const path = n.href.replace('#', '');
            const isActive = activePage === path;
            return (
              <a key={n.label} href={n.href} className={isActive ? 'active' : ''}>
                {n.label}
              </a>
            );
          })}
        </nav>
        <div className="nav-cta">
          <a href="https://www.steelcitynettrade.com" target="_blank" rel="noreferrer" className="btn-ghost">Trade Now</a>
          <button className="btn-solid" onClick={onOpenAccountClick} style={{ border: 'none', cursor: 'pointer' }}>Open Account</button>
        </div>
        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      <AnimatePresence>
        {menuOpen && (
          <motion.div className="mobile-menu" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
            {navItems.map(n => (
              <a key={n.label} href={n.href} className={activePage === n.href.replace('#', '') ? 'active' : ''} onClick={() => setMenuOpen(false)}>
                {n.label}
              </a>
            ))}
            <button className="btn-solid mobile-btn" onClick={() => { setMenuOpen(false); onOpenAccountClick(); }} style={{ border: 'none', cursor: 'pointer' }}>Open Account</button>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}


/* ═══════════════════════════════════════════════
   3a. HERO ANIMATED STATS
   ═══════════════════════════════════════════════ */
function HeroCountUpStat({ target, suffix, label }) {
  const [count, setCount] = React.useState(0);
  const ref = React.useRef(null);
  const started = React.useRef(false);
  React.useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        let start = 0;
        const duration = 2000;
        const step = target / (duration / 16);
        const timer = setInterval(() => {
          start += step;
          if (start >= target) { setCount(target); clearInterval(timer); }
          else setCount(Math.floor(start));
        }, 16);
      }
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);
  return (
    <div className="hero-mini-stat" ref={ref}>
      <span className="hero-mini-num">{count}{suffix}</span>
      <span className="hero-mini-lbl">{label}</span>
    </div>
  );
}

function HeroCountUpStats() {
  return (
    <motion.div
      className="hero-trust-row"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.7 }}
    >
      <HeroCountUpStat target={31} suffix="+" label="Years of Trust" />
      <HeroCountUpStat target={400000} suffix="+" label="Investors Served" />
      <HeroCountUpStat target={420} suffix="+" label="Pan India Locations" />
      <HeroCountUpStat target={22} suffix="" label="States (e-Gov)" />
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════
   3. HERO SECTION (HOME PAGE ONLY)
   ═══════════════════════════════════════════════ */
function Hero({ onOpenAccountClick }) {
  const slides = [
    {
      badge: "🎓 Absolutely Free Online Training",
      title: "FREE STOCK MARKET TRAINING PROGRAM",
      subtitle: "Exclusively For New Investors, Beginners & Aspiring Traders",
      desc: "Learn the fundamentals of stock market investing, trading, technical analysis, risk management, and wealth creation from experienced market professionals.",
      image: "/slide1.png"
    },
    {
      badge: "💻 Interactive Live Webinars",
      title: "FREE LIVE INVESTOR AWARENESS MEETINGS",
      subtitle: "Secure Your Seat For Real-Time Strategy Sessions",
      desc: "Join live online sessions, interactive meetings, and live platform walkthroughs. Get all your doubts resolved in real-time.",
      image: "/slide2.png"
    },
    {
      badge: "🏆 Expert Research Advisors",
      title: "LEARN FROM SKILLED MARKET MENTORS",
      subtitle: "Direct Guidance from SEBI Registered Research Analysts",
      desc: "Get trained by seasoned advisors who guide you step-by-step through technical indicators, trading charts, and disciplined investing habits.",
      image: "/slide3.png"
    }
  ];

  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSlideIndex(prev => (prev + 1) % slides.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const highlights = [
    {
      icon: TrendingUp,
      color: "var(--sky)",
      title: "Zero Brokerage Delivery",
      desc: "Invest in stock markets with ₹0 brokerage on equity delivery trades."
    },
    {
      icon: BarChart3,
      color: "#FFD700",
      title: "SmartTrade Platform",
      desc: "Lightning-fast execution, advanced charting tools, and live data feeds."
    },
    {
      icon: ShieldCheck,
      color: "var(--green)",
      title: "Integrated Depository & e-Gov",
      desc: "Dematerialization under NSDL/CDSL alongside instant digital PAN & NPS."
    }
  ];

  return (
    <section className="hero-section">
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="container hero-grid">
        <motion.div className="hero-text" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <div className="hero-slideshow-wrapper">
            <AnimatePresence mode="wait">
              <motion.div
                key={slideIndex}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                className="hero-slide"
              >
                <div className="slide-content">
                  <div className="slide-badge"><span className="badge-dot" />{slides[slideIndex].badge}</div>
                  <h2 className="slide-title">
                    {slides[slideIndex].title}
                  </h2>
                  <p className="slide-subtitle">
                    {slides[slideIndex].subtitle}
                  </p>
                  <p className="slide-desc">
                    {slides[slideIndex].desc}
                  </p>
                </div>
                <div className="slide-image-container">
                  <img
                    src={slides[slideIndex].image}
                    alt={slides[slideIndex].title}
                  />
                </div>
              </motion.div>
            </AnimatePresence>
            
            <div className="slide-dots">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlideIndex(i)}
                  className="slide-dot"
                  style={{
                    width: slideIndex === i ? '20px' : '6px',
                    background: slideIndex === i ? 'var(--blue)' : '#cbd5e1'
                  }}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Training Program Info Panel */}
          <motion.div
            className="hero-training-panel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="htp-header">
              <span className="htp-tag"><TrendingUp size={14} /> Stock Market Training Program</span>
              <h2 className="htp-headline">Master the Markets. <span className="htp-accent">Trade with Confidence.</span></h2>
              <p className="htp-lead">Are you interested in the Stock Market but don't know where to start? Join our comprehensive online training program and learn from experienced market professionals.</p>
            </div>

            <div className="htp-modules-grid">
              {[
                { icon: BarChart3, color: "#0077b6", label: "Stock Market Basics", items: ["NSE & BSE Overview", "Demat & Trading Accounts", "Types of Orders (Market, Limit, SL)"] },
                { icon: TrendingUp, color: "#059669", label: "Trading Strategies", items: ["Intraday & Swing Trading", "Positional & Delivery Trading", "Understanding Market Trends"] },
                { icon: Activity, color: "#d97706", label: "Technical Analysis", items: ["Candlestick Patterns", "RSI, MACD & Moving Averages", "Support, Resistance & Volume"] },
                { icon: ShieldCheck, color: "#7c3aed", label: "Risk Management", items: ["Capital Protection Strategies", "Stop Loss & Position Sizing", "Risk-Reward Ratio"] },
                { icon: PiggyBank, color: "#0891b2", label: "Wealth Creation", items: ["Long-Term Investing & SIP", "NPS & Retirement Planning", "Portfolio Diversification"] },
                { icon: Star, color: "#dc2626", label: "Program Benefits", items: ["Live Online Sessions & Q&A", "Real Chart Analysis", "Trading Psychology Guidance"] },
              ].map((mod, i) => {
                const Icon = mod.icon;
                return (
                  <motion.div
                    key={i}
                    className="htp-module-card"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.05 * i }}
                    whileHover={{ y: -3, transition: { duration: 0.2 } }}
                  >
                    <div className="htp-mod-icon" style={{ background: `${mod.color}12`, color: mod.color }}>
                      <Icon size={16} />
                    </div>
                    <div className="htp-mod-content">
                      <span className="htp-mod-label">{mod.label}</span>
                      <ul className="htp-mod-items">
                        {mod.items.map((item, j) => <li key={j}>✅ {item}</li>)}
                      </ul>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="htp-who">
              <span className="htp-who-label">👥 Who Should Attend?</span>
              <div className="htp-who-tags">
                {["New Traders", "Working Professionals", "Students", "Business Owners", "Housewives", "Existing Investors"].map(t => (
                  <span key={t} className="htp-who-tag">{t}</span>
                ))}
              </div>
            </div>
          </motion.div>

          <div className="hero-actions">
            <button onClick={onOpenAccountClick} className="btn-primary-lg" style={{ border: 'none', cursor: 'pointer' }}>Open Trading Account <ChevronRight size={20} /></button>
            <a href="#webinars" className="btn-secondary-lg">Register Free Now</a>
          </div>
          <div className="exchange-badges">
            {['NSE', 'BSE', 'MCX', 'NSDL', 'CDSL', 'NCDEX'].map(e => <span key={e} className="exch-badge">{e}</span>)}
          </div>

          {/* Animated count-up stats */}
          <HeroCountUpStats />
        </motion.div>
        <motion.div className="hero-visual" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, delay: 0.2 }}>
          <div className="ceo-float-card">
            <div className="ceo-img-wrap"><img src="/ceo.png" alt="Satish Kumar Arya – MD & CEO, SCSL" /></div>
            <div className="ceo-details">
              <p className="ceo-name">Satish Kumar Arya</p>
              <p className="ceo-title">Managing Director & CEO</p>
              <p className="ceo-quote">"Building wealth, building trust — for every Indian investor."</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   4. WEBINAR SCHEDULE PAGE
   ═══════════════════════════════════════════════ */
function WebinarSchedule({ onRegisterClick }) {
  const [webinars, setWebinars] = useState([]);
  const [loadingWebinars, setLoadingWebinars] = useState(true);

  useEffect(() => {
    const fetchWebinars = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/webinars`);
        if (res.ok) {
          const data = await res.json();
          setWebinars(data);
        }
      } catch (err) {
        console.error('Failed to fetch webinars:', err);
      } finally {
        setLoadingWebinars(false);
      }
    };
    fetchWebinars();
  }, []);

  return (
    <section className="webinar-section section">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">Free Seminars &amp; Webinars</span>
          <h2 className="section-title">Upcoming Investor Awareness Sessions</h2>
        </div>

        <div className="webinar-table-modern">
          <div className="wtm-header">
            <div className="wtm-cell wtm-trainer">Trainer</div>
            <div className="wtm-cell wtm-status">Status</div>
            <div className="wtm-cell wtm-date">Date</div>
            <div className="wtm-cell wtm-time">Language/Time</div>
            <div className="wtm-cell wtm-action"></div>
          </div>
          {loadingWebinars ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>Loading webinars...</div>
          ) : webinars.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>No upcoming webinars scheduled.</div>
          ) : webinars.map((w, i) => (
            <motion.div key={w.id} className="wtm-row" initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <div className="wtm-cell wtm-trainer">
                <img src={w.avatar_url || '/host2.png'} alt={w.trainer} className="trainer-avatar" />
                <div className="trainer-info">
                  <span className="t-name">{w.trainer}</span>
                  <span className="t-region">{w.region}</span>
                </div>
              </div>
              <div className="wtm-cell wtm-status">
                <span className="mode-badge online">{w.mode}</span>
                {w.is_paid ? (
                  <span className="payment-badge paid" style={{ background: '#fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, marginLeft: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    💳 ₹{w.fee_amount}
                  </span>
                ) : (
                  <span className="payment-badge free" style={{ background: '#dcfce7', color: '#16a34a', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, marginLeft: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    🎉 Free
                  </span>
                )}
              </div>
              <div className="wtm-cell wtm-date">{w.date}</div>
              <div className="wtm-cell wtm-time">{w.time}</div>
              <div className="wtm-cell wtm-action">
                <button className="register-now-btn" onClick={() => onRegisterClick(w)}>Register Now</button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   5. STATS BAR
   ═══════════════════════════════════════════════ */
function useCountUp(target, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        let start = 0;
        const step = target / (duration / 16);
        const timer = setInterval(() => {
          start += step;
          if (start >= target) { setCount(target); clearInterval(timer); }
          else setCount(Math.floor(start));
        }, 16);
      }
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);
  return [count, ref];
}

function StatItem({ value, suffix, label, icon: Icon }) {
  const [count, ref] = useCountUp(value);
  return (
    <div className="stat-card" ref={ref}>
      <div className="stat-icon"><Icon size={28} /></div>
      <div className="stat-num">{count}{suffix}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function WhyWebinars() {
  const features = [
    {
      title: "Why Watch SCSL Webinars?",
      icon: Video,
      color: "var(--sky)",
      points: [
        "Learn directly from SEBI-registered research analysts with decades of hands-on experience.",
        "See live market charting, live trade setups, and real-time execution methods.",
        "Get direct access to Q&A sessions to clarify your specific portfolio and trading queries."
      ]
    },
    {
      title: "Why Register in Advance?",
      icon: Calendar,
      color: "#FFD700",
      points: [
        "Secure priority seat reservation as live session rooms have limited capacity.",
        "Receive custom trading templates, strategy spreadsheets, and market cheatsheets.",
        "Get the full HD recorded session and summary notes sent directly to your inbox."
      ]
    },
    {
      title: "What is the Practical Use?",
      icon: TrendingUp,
      color: "var(--green)",
      points: [
        "Master risk-reward ratios, stop-loss strategy, and emotional discipline.",
        "Build standalone trading plans for intraday, swing trading, and investing.",
        "Receive post-webinar support and guidance from the SCSL support team."
      ]
    }
  ];

  return (
    <section className="why-webinars-section" id="why-webinars">
      <div className="why-webinars-blobs">
        <div className="why-blob-1"></div>
        <div className="why-blob-2"></div>
      </div>
      <div className="container">
        <div className="section-header">
          <span className="section-tag" style={{ background: 'rgba(135, 206, 235, 0.15)', color: 'var(--sky)' }}>Investor Empowerment</span>
          <h2 className="section-title" style={{ color: 'var(--white)' }}>Why Choose SCSL Webinars?</h2>
          <p className="section-sub" style={{ color: 'rgba(255, 255, 255, 0.7)', margin: '12px auto 0' }}>
            Transform your understanding of the financial markets with professional guidance and actionable insights.
          </p>
        </div>

        <div className="why-webinars-grid">
          {features.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div 
                className="why-card" 
                key={idx}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.15 }}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
              >
                <div className="why-card-glow" style={{ background: `radial-gradient(circle, ${item.color}10 0%, transparent 70%)` }} />
                <div className="why-card-header">
                  <div className="why-icon-wrap" style={{ border: `1.5px solid ${item.color}40`, color: item.color }}>
                    <Icon size={24} />
                  </div>
                  <h3 className="why-card-title">{item.title}</h3>
                </div>
                <div className="why-card-divider" style={{ background: `linear-gradient(90deg, ${item.color}30, transparent)` }} />
                <ul className="why-points-list">
                  {item.points.map((pt, pIdx) => (
                    <li key={pIdx}>
                      <span className="why-check" style={{ color: item.color }}>✓</span>
                      <p className="why-point-text">{pt}</p>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>

        <motion.div 
          className="why-cta-footer"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <p>Don't trade blindly. Build structural wealth with time-tested professional techniques.</p>
          <a href="#webinars" className="btn-primary-lg" style={{ border: 'none', cursor: 'pointer', marginTop: '15px' }}>
            Browse Scheduled Webinars <ChevronRight size={20} />
          </a>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   6. SERVICES PAGE
   ═══════════════════════════════════════════════ */
const services = [
  { icon: BarChart3, color: '#0077B6', title: 'Stock Broking', desc: 'Equity, Futures & Options, Commodities, and Currency Derivatives across NSE, BSE, MCX, NCDEX & MSEI.', features: ['Equity Cash & F&O', 'Commodity & Currency', 'Research & Advisory', '24×7 Back-Office'] },
  { icon: Landmark, color: '#0096C7', title: 'Depository Services', desc: 'Participant of both NSDL & CDSL. Safe dematerialization and electronic transfer of securities.', features: ['NSDL & CDSL DP', 'e-DIS & e-Mandate', 'Pledge & Margin', 'Nomination Facility'] },
  { icon: Globe, color: '#00B4D8', title: 'e-Governance', desc: 'Authorized TIN-FC centers across 22 states providing PAN, TAN, e-TDS, and AIR services.', features: ['PAN Card Services', 'TAN Registration', 'e-TDS Filing', 'AIR Reporting'] },
  { icon: ShieldCheck, color: '#48CAE4', title: 'Life Insurance', desc: 'Corporate Agent for SBI Life Insurance — securing the financial future of your family.', features: ['Term Insurance', 'ULIP Plans', 'Child Plans', 'Retirement Plans'] },
  { icon: Coins, color: '#0077B6', title: 'NBFC Loan Services', desc: 'Quick and hassle-free loan solutions through our registered NBFC arm.', features: ['Personal Loans', 'Gold Loans', 'Business Loans', 'Loans Against Securities'] },
  { icon: PiggyBank, color: '#0096C7', title: 'Investments', desc: 'Mutual Funds, IPO Distribution, and National Pension System through expert wealth advisors.', features: ['Mutual Funds SIP', 'IPO Applications', 'NPS (POP-PFRDA)', 'Portfolio Review'] },
];

function ServiceCard({ svc, idx }) {
  const Icon = svc.icon;
  return (
    <motion.div className="svc-card" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1, duration: 0.5 }} whileHover={{ y: -8, boxShadow: '0 24px 48px rgba(0,119,182,0.12)' }}>
      <div className="svc-icon-wrap" style={{ background: `${svc.color}18` }}><Icon size={32} color={svc.color} /></div>
      <h3 className="svc-title">{svc.title}</h3>
      <p className="svc-desc">{svc.desc}</p>
      <ul className="svc-features">{svc.features.map(f => <li key={f}><CheckCircle size={14} /> {f}</li>)}</ul>
      <a href="#contact" className="svc-link">Learn More <ArrowRight size={15} /></a>
    </motion.div>
  );
}

function Services({ limit }) {
  const displayedServices = limit ? services.slice(0, limit) : services;
  return (
    <section className="services-section">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">Our Expertise</span>
          <h2 className="section-title">Comprehensive Financial Solutions</h2>
          <p className="section-sub">One platform. Every financial need. Backed by 31 years of excellence.</p>
        </div>
        <div className="services-grid">{displayedServices.map((svc, idx) => <ServiceCard key={idx} svc={svc} idx={idx} />)}</div>
        {limit && (
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <a href="#services" className="btn-secondary-lg">View All Services</a>
          </div>
        )}
      </div>
    </section>
  );
}

const hubServices = [
  {
    title: "Online Demat & Trading Account",
    desc: "Start trading and investing with ease, fully online.",
    url: "https://newekyc.steelcitynettrade.com/ekyc-admin/loginNew",
    category: "broking",
    icon: TrendingUp,
    color: "#0077B6"
  },
  {
    title: "Stock Broking Smart Trade",
    desc: "Advanced tools for professional trading and high-speed execution.",
    url: "https://etrade.steelcitynettrade.com/",
    category: "broking",
    icon: Rocket,
    color: "#0077B6"
  },
  {
    title: "Broking / DP Backoffice",
    desc: "Seamless trade tracking, ledger reports, and account management.",
    url: "https://weblogin.steelcitynettrade.com/WebLogin/index.cfm?Logintype=Branch",
    category: "broking",
    icon: Briefcase,
    color: "#0077B6"
  },
  {
    title: "Re-KYC Portal",
    desc: "Stay compliant, hassle-free and update your account details online.",
    url: "https://newekyc.steelcitynettrade.com/re-ekyc",
    category: "broking",
    icon: UserCheck,
    color: "#0077B6"
  },
  {
    title: "Mutual Funds",
    desc: "Grow your wealth with expert-selected funds and regular SIP plans.",
    url: "https://play.google.com/store/apps/details?id=com.steelcity.finsuite&hl=en_IN",
    category: "broking",
    icon: Coins,
    color: "#0077B6"
  },
  {
    title: "PAN Services",
    desc: "Quick and easy PAN processing, digitally and paperlessly.",
    url: "https://onlineservices.proteantech.in/paam/",
    category: "egov",
    icon: FileText,
    color: "#0096C7"
  },
  {
    title: "Instant PAN",
    desc: "Get your digital PAN card generated in just four simple steps!",
    url: "https://backoffice.steelcitynettrade.com/backoffice/PanRed/PAN_ReDirect.aspx",
    category: "egov",
    icon: Award,
    color: "#0096C7"
  },
  {
    title: "eGov Backoffice",
    desc: "Seamless support for all your agency and e-Governance operations.",
    url: "https://backoffice.steelcitynettrade.com/backoffice/SCwbb/login.aspx",
    category: "egov",
    icon: Laptop,
    color: "#0096C7"
  },
  {
    title: "eGov Registration",
    desc: "Register new users easily online and activate branch services.",
    url: "https://backoffice.steelcitynettrade.com/backoffice/APIBrachCreation/Tin_NewUserReg.aspx",
    category: "egov",
    icon: UserPlus,
    color: "#0096C7"
  },
  {
    title: "National Pension System (NPS)",
    desc: "Plan your retirement with simple, reliable government-backed solutions.",
    url: "https://mynps360direct.nps-proteantech.in/admin-app/realms/STC5000332",
    category: "egov",
    icon: PiggyBank,
    color: "#0096C7"
  },
  {
    title: "Bajaj Insta EMI",
    desc: "Get instant EMI card options for all your utility and retail purchases.",
    url: "https://www.bajajfinserv.in/webform/emicard/login?utm_source=Protean&utm_medium=field&utm_campaign=2000101",
    category: "egov",
    icon: CreditCard,
    color: "#0096C7"
  },
  {
    title: "Wellness Product",
    desc: "Access unlimited tele-doctor consultation and healthcare perks.",
    url: "https://partner.coversure.in/prosure/?source=Protean&password=s1crOqawgda6GFIMsu13d2WJ8WILc2soIbQvaltOKMN&agent_id=2000123",
    category: "egov",
    icon: Activity,
    color: "#0096C7"
  },
  {
    title: "Track PAN/TAN Application",
    desc: "Check your PAN or TAN application progress online in real time.",
    url: "https://tin.tin.proteantech.in/pantan/StatusTrack.html",
    category: "egov",
    icon: Search,
    color: "#0096C7"
  },
  {
    title: "Common Service Center (CSC)",
    desc: "Access diverse government and business services via Digital Seva.",
    url: "https://digitalseva.csc.gov.in/",
    category: "egov",
    icon: Network,
    color: "#0096C7"
  },
  {
    title: "Personal Loan",
    desc: "Get funds quickly and digitally for your personal needs.",
    url: "https://portal.fibe.in/easy-loan?utm_source=Protean&campaignid=2000123",
    category: "loans",
    icon: Coins,
    color: "#00B4D8"
  },
  {
    title: "Education Loan",
    desc: "Invest in your academic future with hassle-free educational financing.",
    url: "https://partnerships.propelld.com/?utm_source=protean&utm_agent=2000123",
    category: "loans",
    icon: GraduationCap,
    color: "#00B4D8"
  },
  {
    title: "Home Loan",
    desc: "Own your dream home with easy financing terms and fast disbursal.",
    url: "https://www.mahindrahomefinance.com/applyforloan/?utm_source=ProTean&utm_medium=Digital&utm_campaign=2000123",
    category: "loans",
    icon: Home,
    color: "#00B4D8"
  },
  {
    title: "Fixed Deposits",
    desc: "Secure high returns with top-rated and trusted bank options.",
    url: "https://fd.1silverbullet.tech/agent/customers",
    category: "loans",
    icon: Coins,
    color: "#00B4D8"
  },
  {
    title: "Wizr Marketplace",
    desc: "Explore India's ultimate professional skilling and learning marketplace.",
    url: "https://www.proteanlive.wizr.in/agent?utm_source=protean&utm_medium=social&utm_campaign=spring_sale&utm_content=ad_banner&utm_term=4555&paywall=true&agent=-2000123",
    category: "loans",
    icon: BookOpen,
    color: "#00B4D8"
  },
  {
    title: "Life & Health Insurance",
    desc: "Comprehensive coverage across Life, Health, and General Insurance policies.",
    url: "https://sellonline.tataaig.com/ipdsv2/login/#/login",
    category: "insurance",
    icon: Shield,
    color: "#48CAE4"
  },
  {
    title: "Referral Registration",
    desc: "Join as a Steel City Referral Partner – Register and start earning.",
    url: "https://backoffice.steelcitynettrade.com/backoffice/RefCreation/Ref_NewUserReg.aspx",
    category: "corporate",
    icon: Users,
    color: "#0077B6"
  },
  {
    title: "eMail Corporate Login",
    desc: "Access your Steel City corporate email account securely.",
    url: "https://mail.steelcitynettrade.com/",
    category: "corporate",
    icon: Mail,
    color: "#0077B6"
  },
  {
    title: "Employee Portal Login",
    desc: "Login to the internal employee portal for updates, tasking, and logs.",
    url: "https://backoffice.steelcitynettrade.com/backoffice/MARKETTING/LoginPage.aspx",
    category: "corporate",
    icon: UserCheck,
    color: "#0077B6"
  }
];

function ServicesHub() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const categories = [
    { id: "all", label: "All Services" },
    { id: "broking", label: "Stock Broking" },
    { id: "egov", label: "e-Governance" },
    { id: "loans", label: "Loans & FDs" },
    { id: "insurance", label: "Insurance" },
    { id: "corporate", label: "Partner & Employee" }
  ];

  const filteredServices = hubServices.filter(s => {
    const matchesTab = activeTab === "all" || s.category === activeTab;
    const matchesSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.desc.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <section className="hub-section section">
      <div className="hub-blobs">
        <div className="hub-blob-1" />
        <div className="hub-blob-2" />
      </div>
      <div className="container" style={{ position: 'relative', zIndex: 2 }}>
        <div className="section-header">
          <span className="section-tag">Quick Action Center</span>
          <h2 className="section-title">Steel City Services Hub</h2>
          <p className="section-sub">Access all stock broking, depository, e-governance, loan products, and partner portal tools under one unified screen.</p>
        </div>

        <div className="hub-controls">
          <div className="hub-search-wrapper">
            <Search className="hub-search-icon" size={20} />
            <input 
              type="text" 
              placeholder="Search services (e.g. PAN, demat, loan...)" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="hub-search-input"
            />
            {searchTerm && <button className="hub-clear-btn" onClick={() => setSearchTerm("")}><X size={16} /></button>}
          </div>

          <div className="hub-tabs">
            {categories.map(c => (
              <button 
                key={c.id} 
                className={`hub-tab-btn ${activeTab === c.id ? 'active' : ''}`}
                onClick={() => setActiveTab(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {filteredServices.length === 0 ? (
          <div className="hub-empty-state">
            <p>No services found matching your criteria. Try searching for something else!</p>
          </div>
        ) : (
          <div className="hub-grid">
            <AnimatePresence mode="popLayout">
              {filteredServices.map((svc) => {
                const Icon = svc.icon;
                return (
                  <motion.a 
                    key={svc.title}
                    href={svc.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="hub-card"
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(0,119,182,0.18)' }}
                  >
                    <div className="hub-card-header">
                      <div className="hub-icon-wrap" style={{ background: `${svc.color}15`, color: svc.color }}>
                        <Icon size={24} />
                      </div>
                      <span className="hub-category-tag">{categories.find(c => c.id === svc.category)?.label}</span>
                    </div>
                    <h3 className="hub-card-title">{svc.title}</h3>
                    <p className="hub-card-desc">{svc.desc}</p>
                    <div className="hub-card-action">
                      <span>Launch Service</span>
                      <ArrowRight size={14} />
                    </div>
                  </motion.a>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   7. JOURNEY ROADMAP PAGE
   ═══════════════════════════════════════════════ */
const investorSteps = [
  { step: '01', title: 'Open Account', desc: 'Quick paperless KYC via Aadhaar + PAN. Get your Demat & Trading account in minutes.' },
  { step: '02', title: 'Get Research Access', desc: 'Access daily research calls, market analysis, and expert recommendations.' },
  { step: '03', title: 'Trade & Invest', desc: 'Start trading in Equity, F&O, Commodities, or invest via SIPs, IPOs, and NPS.' },
  { step: '04', title: 'Protect & Grow', desc: 'Secure your wealth with Insurance, NBFC loans against securities, and long-term NPS.' },
];

const partnerSteps = [
  { step: '01', title: 'Inquire & Register', desc: 'Submit your Sub-Broker enquiry. Our team connects with you within 24 hours.' },
  { step: '02', title: 'Setup & Connect', desc: 'Receive your terminal, back-office access & VSAT connectivity to our central servers.' },
  { step: '03', title: 'Launch Services', desc: 'Offer the full suite: Trading, DP, Insurance, NPS, Loans, and PAN services.' },
  { step: '04', title: 'Scale with SCSL', desc: 'Grow with dedicated support, risk management, and our nationwide brand.' },
];

function RoadmapStep({ step, isLast }) {
  return (
    <motion.div className="roadmap-step" initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 * parseInt(step.step), duration: 0.5 }}>
      <div className="step-num">{step.step}</div>
      <div className="step-body"><h4>{step.title}</h4><p>{step.desc}</p></div>
      {!isLast && <div className="step-connector" />}
    </motion.div>
  );
}

function Journey() {
  const [tab, setTab] = useState('investor');
  const steps = tab === 'investor' ? investorSteps : partnerSteps;
  return (
    <section className="journey-section">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">Your Path with SCSL</span>
          <h2 className="section-title">A Structured Journey to Success</h2>
        </div>
        <div className="journey-tabs">
          <button className={`jtab ${tab === 'investor' ? 'active' : ''}`} onClick={() => setTab('investor')}>Investor Journey</button>
          <button className={`jtab ${tab === 'partner' ? 'active' : ''}`} onClick={() => setTab('partner')}>Partner (Sub-Broker) Roadmap</button>
        </div>
        <div className="roadmap">{steps.map((s, i) => <RoadmapStep key={s.step + tab} step={s} isLast={i === steps.length - 1} />)}</div>
        <div className="journey-cta">
          {tab === 'investor'
            ? <a href="#contact" className="btn-primary-lg">Start Your Investment Journey <ChevronRight size={18} /></a>
            : <a href="#contact" className="btn-primary-lg">Become a Sub-Broker Partner <ChevronRight size={18} /></a>}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   8. ABOUT / LEADERSHIP PAGE
   ═══════════════════════════════════════════════ */
function About() {
  return (
    <section className="about-section">
      <div className="container about-grid">
        <motion.div className="about-text" initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
          <span className="section-tag">Our Story</span>
          <h2 className="section-title">Three Decades of<br />Trusted Financial Leadership</h2>
          <p>Founded in <strong>1995</strong> by Kamireddy Satyanarayana, Steel City Securities Limited began with a singular mission: to make Indian capital markets accessible, transparent, and investor-friendly. Today, with over <strong>31 years of industry presence</strong>, SCSL stands as a comprehensive financial powerhouse.</p>
          <p style={{ marginTop: '1rem' }}>Listed on <strong>NSE and MSEI</strong>, and proudly holding <strong>ISO 9001:2015</strong> certification, our working culture is built on "Dedication & Trustworthiness" — the two pillars that define every interaction.</p>
          <blockquote className="about-quote">"Do Good to Do Well, and Do Well to Do Good."<cite>— SCSL Corporate Philosophy</cite></blockquote>
          <div className="leadership-cards">
            <div className="leader-card">
              <div className="leader-avatar">KS</div>
              <div><p className="leader-name">Kamireddy Satyanarayana</p><p className="leader-role">Founder & Executive Chairman</p></div>
            </div>
            <div className="leader-card">
              <div className="leader-avatar">SA</div>
              <div><p className="leader-name">Satish Kumar Arya</p><p className="leader-role">Managing Director & CEO</p></div>
            </div>
          </div>
        </motion.div>
        <motion.div className="about-visual" initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.2 }}>
          <div className="vision-board">
            <div className="vision-item"><h4>Our Vision</h4><p>Towards making the Indian Securities Market — Transparent, Efficient, and Investor Friendly.</p></div>
            <div className="vision-item"><h4>Our Mission</h4><p>To hold securities in dematerialised form and provide safe, reliable and efficient depository services.</p></div>
            <div className="trust-logos">
              <p className="trust-title">Registered & Regulated by</p>
              <div className="trust-grid">{['SEBI', 'PFRDA', 'RBI', 'NSDL', 'CDSL', 'MCX', 'NSE', 'BSE'].map(b => <div key={b} className="trust-badge">{b}</div>)}</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   9. TESTIMONIALS
   ═══════════════════════════════════════════════ */
const testimonials = [
  { name: 'Rajesh Venkata', role: 'Equity Trader, Hyderabad', rating: 5, text: "SCSL's research desk gives top-quality F&O calls. I've been trading with them for 8 years and the back-office is truly 24×7." },
  { name: 'Priya Subramaniam', role: 'Sub-Broker Partner, Chennai', rating: 5, text: 'As a sub-broker, the terminal support and seamless connectivity has helped me grow my client base significantly.' },
  { name: 'V. Krishna Murthy', role: 'Retired Investor, Vijayawada', rating: 5, text: 'I trust SCSL for my NPS and Mutual Fund SIPs. The team is always professional and responsive.' },
  { name: 'Santhosh Reddy', role: 'Franchise Owner, Visakhapatnam', rating: 5, text: 'The brand value of Steel City is unmatched in Andhra Pradesh. My clients have full confidence.' },
];

function Testimonials() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive(p => (p + 1) % testimonials.length), 5000);
    return () => clearInterval(t);
  }, []);
  const t = testimonials[active];
  return (
    <section className="testimonials-section">
      <div className="container">
        <div className="section-header light">
          <span className="section-tag light">What Our Clients Say</span>
          <h2 className="section-title light">Trusted by Investors Across India</h2>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={active} className="testimonial-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
            <div className="t-stars">{Array(t.rating).fill(0).map((_, i) => <Star key={i} size={18} fill="#FFD700" color="#FFD700" />)}</div>
            <p className="t-text">"{t.text}"</p>
            <div className="t-author">
              <div className="t-avatar">{t.name.charAt(0)}</div>
              <div><p className="t-name">{t.name}</p><p className="t-role">{t.role}</p></div>
            </div>
          </motion.div>
        </AnimatePresence>
        <div className="t-dots">{testimonials.map((_, i) => <button key={i} className={`t-dot ${i === active ? 'active' : ''}`} onClick={() => setActive(i)} />)}</div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   10. CONTACT PAGE
   ═══════════════════════════════════════════════ */
function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setSent(true);
        setTimeout(() => setSent(false), 5000);
        setForm({ name: '', email: '', phone: '', message: '' });
      } else {
        alert('Failed to submit form to server.');
      }
    } catch (err) {
      console.error(err);
      alert('Error contacting backend server. Storing lead failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="contact-section">
      <div className="container contact-grid">
        <motion.div className="contact-info" initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
          <span className="section-tag">Get in Touch</span>
          <h2 className="section-title">Start Your Journey<br />with SCSL Today</h2>
          <p>Whether you want to open a trading account, become a franchise partner, or need support — our team is ready.</p>
          <div className="contact-details">
            <div className="cinfo-row"><MapPin size={20} color="#0077B6" /><div><strong>Head Office</strong><br />Steel City Heights, 50-81-18, Seethammapeta Main Road,<br />Visakhapatnam, AP – 530016</div></div>
            <div className="cinfo-row"><PhoneCall size={20} color="#0077B6" /><div><strong>Helpline</strong><br />+91 0891-2563581 / 6770222 / 3010969</div></div>
            <div className="cinfo-row"><Mail size={20} color="#0077B6" /><div><strong>Email Support</strong><br />scsl@steelcitynettrade.com<br />helpdesk@steelcitynettrade.com</div></div>
          </div>
        </motion.div>
        <motion.form className="contact-form" onSubmit={handleSubmit} initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.2 }}>
          {sent && <div className="form-success">✅ Thank you! We will contact you shortly.</div>}
          <div className="form-row">
            <input type="text" placeholder="Your Full Name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} disabled={submitting} />
            <input type="email" placeholder="Email Address" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} disabled={submitting} />
          </div>
          <input type="tel" placeholder="Phone Number" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} disabled={submitting} />
          <textarea rows={4} placeholder="How can we help you?" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} disabled={submitting} />
          <button type="submit" className="btn-primary-lg form-submit" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Send Enquiry'} <ChevronRight size={18} />
          </button>
        </motion.form>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   11a. WEBINAR MANAGE TAB (Admin Sub-Component)
   ═══════════════════════════════════════════════ */
const BLANK_WEBINAR = { id: null, trainer: '', region: '', date: '', day: '', time: '', topic: '', mode: 'Online', seats: 200, link: '', avatar_url: '/host2.png', is_paid: false, fee_amount: 0, payment_utr_required: true };

function WebinarManageTab({ authHeader, allRegistrations }) {
  const [webinars, setWebinars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(BLANK_WEBINAR);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const fetchWebinars = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/webinars`);
      if (res.ok) setWebinars(await res.json());
    } catch (err) {
      console.error('Failed to fetch webinars:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWebinars(); }, []);

  const openCreate = () => { setFormData(BLANK_WEBINAR); setShowForm(true); };
  const openEdit   = (w)  => { setFormData({ ...w }); setShowForm(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/webinars/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowForm(false);
        fetchWebinars();
      } else if (res.status === 401) {
        alert('Session expired. Please log out and log in again.');
      } else {
        alert('Failed to save webinar.');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving webinar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this webinar?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/webinars/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': authHeader }
      });
      if (res.ok) fetchWebinars();
      else alert('Failed to delete webinar.');
    } catch (err) {
      console.error(err);
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: '1px solid #CBD5E1', fontSize: '0.9rem', outline: 'none',
    background: 'white', boxSizing: 'border-box'
  };
  const labelStyle = { fontWeight: 600, fontSize: '0.85rem', color: 'var(--navy)', display: 'block', marginBottom: '5px' };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ color: 'var(--navy)', margin: 0 }}>Manage Webinars</h3>
        <button
          className="btn-solid"
          onClick={openCreate}
          style={{ border: 'none', cursor: 'pointer', padding: '10px 20px', fontSize: '0.9rem' }}
        >
          + Create Webinar
        </button>
      </div>

      {loading ? (
        <div className="admin-loader">Loading webinars...</div>
      ) : webinars.length === 0 ? (
        <div className="admin-empty">No webinars found. Create one above.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {webinars.map(w => {
            const regs = allRegistrations.filter(r => r.webinar_id === w.id);
            const isExpanded = expandedId === w.id;
            return (
              <div key={w.id} style={{ background: 'var(--white)', border: '1px solid var(--light)', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
                <div style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <img
                    src={w.avatar_url || '/host2.png'}
                    alt={w.trainer}
                    style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--sky)', flexShrink: 0 }}
                    onError={e => { e.target.src = '/host2.png'; }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--navy)', margin: '0 0 4px' }}>{w.topic}</p>
                        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: '0 0 2px' }}>
                          <strong>{w.trainer}</strong> · {w.region}
                        </p>
                        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>
                          {w.date} ({w.day}) · {w.time}
                        </p>
                        {w.link && (
                          <a href={w.link} target="_blank" rel="noreferrer" style={{ color: 'var(--blue)', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                            🔗 {w.link}
                          </a>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        {w.is_paid && (
                          <span style={{ background: '#fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700 }}>
                            💳 ₹{w.fee_amount}
                          </span>
                        )}
                        <span style={{ background: '#e8f0fe', color: 'var(--blue)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>
                          {regs.length} / {w.seats} registered
                        </span>
                        <button
                          onClick={() => openEdit(w)}
                          style={{ background: 'var(--sky)', color: 'var(--navy)', border: 'none', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                        >Edit</button>
                        <button
                          onClick={() => handleDelete(w.id)}
                          style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                        >Delete</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--light)' }}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : w.id)}
                    style={{ width: '100%', background: 'none', border: 'none', padding: '12px 20px', cursor: 'pointer', textAlign: 'left', color: 'var(--blue)', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {isExpanded ? '▲' : '▶'} View Registered Users ({regs.length})
                  </button>
                  {isExpanded && (
                    <div style={{ padding: '0 20px 16px' }}>
                      {regs.length === 0 ? (
                        <div className="admin-empty" style={{ margin: 0 }}>No registrations for this webinar yet.</div>
                      ) : (
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Name</th>
                              <th>Email</th>
                              <th>Phone</th>
                              {w.is_paid && <th>Payment</th>}
                              {w.is_paid && <th>UTR Ref</th>}
                              <th>Registered At</th>
                            </tr>
                          </thead>
                          <tbody>
                            {regs.map((r, idx) => (
                              <tr key={r.id}>
                                <td>{idx + 1}</td>
                                <td className="bold">{r.name}</td>
                                <td><a href={`mailto:${r.email}`}>{r.email}</a></td>
                                <td>{r.phone || '-'}</td>
                                {w.is_paid && (
                                  <td>
                                    <span style={{ background: r.payment_status === 'paid' ? '#dcfce7' : '#fee2e2', color: r.payment_status === 'paid' ? '#16a34a' : '#dc2626', padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600 }}>
                                      {r.payment_status === 'paid' ? `✓ ₹${r.fee_paid || w.fee_amount}` : 'Pending'}
                                    </span>
                                  </td>
                                )}
                                {w.is_paid && <td style={{ fontSize: '0.8rem', color: '#555' }}>{r.payment_utr || '—'}</td>}
                                <td>{new Date(r.timestamp).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
            onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              style={{ background: 'white', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ color: 'var(--navy)', margin: 0 }}>{formData.id ? 'Edit Webinar' : 'Create Webinar'}</h3>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: 'var(--muted)' }}>×</button>
              </div>
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>Topic *</label>
                    <input style={inputStyle} required value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} placeholder="e.g. Smart Investing Secrets" />
                  </div>
                  <div>
                    <label style={labelStyle}>Trainer Name *</label>
                    <input style={inputStyle} required value={formData.trainer} onChange={e => setFormData({...formData, trainer: e.target.value})} placeholder="e.g. Avadhut Sathe" />
                  </div>
                  <div>
                    <label style={labelStyle}>Region *</label>
                    <input style={inputStyle} required value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})} placeholder="e.g. Pan India" />
                  </div>
                  <div>
                    <label style={labelStyle}>Date *</label>
                    <input style={inputStyle} required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} placeholder="e.g. 30 May" />
                  </div>
                  <div>
                    <label style={labelStyle}>Day</label>
                    <input style={inputStyle} value={formData.day} onChange={e => setFormData({...formData, day: e.target.value})} placeholder="e.g. Thursday" />
                  </div>
                  <div>
                    <label style={labelStyle}>Time / Language *</label>
                    <input style={inputStyle} required value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} placeholder="e.g. English | 6:00 PM – 9:00 PM" />
                  </div>
                  <div>
                    <label style={labelStyle}>Mode</label>
                    <select style={inputStyle} value={formData.mode} onChange={e => setFormData({...formData, mode: e.target.value})}>
                      <option value="Online">Online</option>
                      <option value="Offline">Offline</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Seats</label>
                    <input style={inputStyle} type="number" min="1" value={formData.seats} onChange={e => setFormData({...formData, seats: parseInt(e.target.value)||200})} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Join Link (Zoom / Teams / Meet URL)</label>
                  <input style={inputStyle} value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} placeholder="https://zoom.us/j/..." />
                </div>
                <div>
                  <label style={labelStyle}>Trainer Avatar URL</label>
                  <input style={inputStyle} value={formData.avatar_url} onChange={e => setFormData({...formData, avatar_url: e.target.value})} placeholder="/host2.png" />
                </div>
                  <div style={{ gridColumn: '1 / -1', background: '#f8fafc', borderRadius: '10px', padding: '16px', border: '1.5px solid #e2e8f0' }}>
                  <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--navy)', marginBottom: '12px' }}>💳 Payment Settings</p>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 16px', borderRadius: '8px', border: `2px solid ${!formData.is_paid ? 'var(--blue)' : '#e2e8f0'}`, background: !formData.is_paid ? '#e8f0fe' : 'white', fontWeight: 600, fontSize: '0.875rem' }}>
                      <input type="radio" name="paytype" value="free" checked={!formData.is_paid} onChange={() => setFormData({...formData, is_paid: false, fee_amount: 0})} style={{ accentColor: 'var(--blue)' }} />
                      🎉 Free Webinar
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 16px', borderRadius: '8px', border: `2px solid ${formData.is_paid ? '#d97706' : '#e2e8f0'}`, background: formData.is_paid ? '#fef3c7' : 'white', fontWeight: 600, fontSize: '0.875rem' }}>
                      <input type="radio" name="paytype" value="paid" checked={formData.is_paid} onChange={() => setFormData({...formData, is_paid: true})} style={{ accentColor: '#d97706' }} />
                      💳 Paid Webinar
                    </label>
                  </div>
                  {formData.is_paid && (
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                      <div style={{ flex: 1, minWidth: '160px' }}>
                        <label style={labelStyle}>Fee Amount (₹) *</label>
                        <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #d97706', borderRadius: '8px', overflow: 'hidden', background: 'white' }}>
                          <span style={{ padding: '0 12px', background: '#fef3c7', fontWeight: 700, color: '#d97706', borderRight: '1px solid #d97706', fontSize: '1rem' }}>₹</span>
                          <input
                            style={{ ...inputStyle, border: 'none', borderRadius: 0, flex: 1 }}
                            type="number" min="1" step="1"
                            placeholder="e.g. 500"
                            value={formData.fee_amount}
                            onChange={e => setFormData({...formData, fee_amount: parseFloat(e.target.value) || 0})}
                          />
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={labelStyle}>Require UTR Reference?</label>
                        <select style={inputStyle} value={formData.payment_utr_required ? 'yes' : 'no'} onChange={e => setFormData({...formData, payment_utr_required: e.target.value === 'yes'})}>
                          <option value="yes">Yes – Verify UTR from user</option>
                          <option value="no">No – Trust user (no UTR needed)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button type="button" onClick={() => setShowForm(false)} style={{ padding: '12px 24px', borderRadius: '10px', border: '1.5px solid var(--light)', background: 'white', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                  <button type="submit" className="btn-solid" disabled={saving} style={{ border: 'none', cursor: 'pointer', padding: '12px 24px' }}>
                    {saving ? 'Saving...' : formData.id ? 'Save Changes' : 'Create Webinar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   11. LEADS ADMIN DASHBOARD PAGE
   ═══════════════════════════════════════════════ */
function LeadsAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!sessionStorage.getItem('scsl_admin_auth'));
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [leads, setLeads] = useState({ contacts: [], registrations: [], page_views: [], logins: [], account_openings: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('contacts');

  const fetchLeads = async () => {
    const authHeaderVal = sessionStorage.getItem('scsl_admin_auth');
    if (!authHeaderVal) {
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/leads`, {
        headers: { 'Authorization': authHeaderVal }
      });
      if (res.status === 401) {
        sessionStorage.removeItem('scsl_admin_auth');
        setIsAuthenticated(false);
        setError('Session expired or invalid credentials.');
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch data from API');
      const data = await res.json();
      setLeads(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Could not connect to backend server. Make sure the FastAPI backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchLeads();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError('');
    const authHeaderVal = 'Basic ' + btoa(usernameInput + ':' + passwordInput);
    try {
      const res = await fetch(`${API_BASE_URL}/api/leads`, {
        headers: { 'Authorization': authHeaderVal }
      });
      if (res.ok) {
        sessionStorage.setItem('scsl_admin_auth', authHeaderVal);
        setIsAuthenticated(true);
        const data = await res.json();
        setLeads(data);
        setError(null);
      } else if (res.status === 401) {
        setLoginError('Invalid username or password.');
      } else {
        setLoginError('Server error: ' + res.status);
      }
    } catch (err) {
      console.error(err);
      setLoginError('Could not connect to the backend server.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('scsl_admin_auth');
    setIsAuthenticated(false);
    setLeads({ contacts: [], registrations: [], page_views: [], logins: [], account_openings: [] });
    setUsernameInput('');
    setPasswordInput('');
    setLoginError('');
  };

  const handleDelete = async (type, id) => {
    const typeLabel = type === 'contact' ? 'lead' : type === 'registration' ? 'webinar registration' : 'account opening request';
    if (!window.confirm(`Are you sure you want to delete this ${typeLabel}?`)) return;
    const authHeaderVal = sessionStorage.getItem('scsl_admin_auth');
    try {
      const res = await fetch(`${API_BASE_URL}/api/leads/delete`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': authHeaderVal || ''
        },
        body: JSON.stringify({ type, id })
      });
      if (res.status === 401) {
        sessionStorage.removeItem('scsl_admin_auth');
        setIsAuthenticated(false);
        alert('Authentication failed. Please log in again.');
        return;
      }
      if (res.ok) {
        fetchLeads();
      } else {
        alert('Failed to delete the entry.');
      }
    } catch (err) {
      console.error(err);
      alert('Error contacting backend server.');
    }
  };

  const filteredContacts = leads.contacts.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search)) ||
    (c.message && c.message.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredRegs = leads.registrations.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.email.toLowerCase().includes(search.toLowerCase()) ||
    (r.phone && r.phone.includes(search)) ||
    r.topic.toLowerCase().includes(search.toLowerCase())
  );

  const filteredAccounts = (leads.account_openings || []).filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase()) ||
    (a.phone && a.phone.includes(search)) ||
    (a.pan && a.pan.toLowerCase().includes(search.toLowerCase())) ||
    (a.aadhaar && a.aadhaar.includes(search)) ||
    (a.state && a.state.toLowerCase().includes(search.toLowerCase()))
  );

  if (!isAuthenticated) {
    return (
      <section className="admin-login-section" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--offwhite)', padding: '40px 20px' }}>
        <motion.div 
          className="admin-login-card" 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.5 }}
          style={{
            background: 'var(--white)',
            padding: '40px',
            borderRadius: '24px',
            boxShadow: 'var(--shadow-lg)',
            width: '100%',
            maxWidth: '440px',
            border: '1px solid var(--light)'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <img src="https://www.steelcitynettrade.com/images/Steelcity-logo.png" alt="SCSL Logo" style={{ height: '45px', margin: '0 auto 20px auto' }} />
            <h2 style={{ color: 'var(--navy)', fontWeight: 800, fontSize: '1.6rem', marginBottom: '8px' }}>Admin Portal</h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>Secure sign-in for authorized staff only</p>
          </div>
          
          {loginError && (
            <div style={{ background: '#FEE2E2', color: 'var(--red)', padding: '12px 16px', borderRadius: '10px', fontSize: '0.9rem', marginBottom: '20px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠️</span> {loginError}
            </div>
          )}
          
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="mform-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--navy)' }}>Username</label>
              <input 
                type="text" 
                placeholder="Enter your username" 
                required 
                value={usernameInput} 
                onChange={e => setUsernameInput(e.target.value)} 
                disabled={loggingIn}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  background: 'var(--white)',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'var(--transition)'
                }}
              />
            </div>
            
            <div className="mform-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--navy)' }}>Password</label>
              <input 
                type="password" 
                placeholder="Enter your password" 
                required 
                value={passwordInput} 
                onChange={e => setPasswordInput(e.target.value)} 
                disabled={loggingIn}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  background: 'var(--white)',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'var(--transition)'
                }}
              />
            </div>
            
            <button 
              type="submit" 
              className="btn-solid" 
              disabled={loggingIn}
              style={{ 
                width: '100%', 
                padding: '14px', 
                fontSize: '1rem', 
                marginTop: '10px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {loggingIn ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </motion.div>
      </section>
    );
  }

  return (
    <section className="admin-section">
      <div className="container">
        <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h1 className="admin-title">SCSL Admin Portal</h1>
            <p className="admin-subtitle">Monitor inquiries, registrations, and account applications stored in cloud database</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button className="btn-solid refresh-btn" onClick={fetchLeads} style={{ border: 'none', cursor: 'pointer' }}>Refresh Data</button>
            <button className="btn-ghost" onClick={handleLogout} style={{ border: '1.5px solid var(--sky)', color: 'var(--blue)', background: 'transparent', cursor: 'pointer' }}>Logout</button>
          </div>
        </div>

        {error && (
          <div className="admin-error-banner">
            <p>⚠️ {error}</p>
          </div>
        )}

        <div className="admin-stats-grid">
          <div className="astat-card">
            <h4>General Inquiries</h4>
            <div className="astat-val">{leads.contacts.length}</div>
            <p>Contact form submissions</p>
          </div>
          <div className="astat-card">
            <h4>Webinar Registrations</h4>
            <div className="astat-val">{leads.registrations.length}</div>
            <p>Seats booked across all topics</p>
          </div>
          <div className="astat-card">
            <h4>Account Openings</h4>
            <div className="astat-val">{(leads.account_openings || []).length}</div>
            <p>Demat & Trading account applications</p>
          </div>
        </div>

        <div className="admin-controls">
          <div className="admin-tabs">
            <button className={`admin-tab ${activeTab === 'contacts' ? 'active' : ''}`} onClick={() => setActiveTab('contacts')}>
              Contact Leads ({filteredContacts.length})
            </button>
            <button className={`admin-tab ${activeTab === 'registrations' ? 'active' : ''}`} onClick={() => setActiveTab('registrations')}>
              Webinar Regs ({filteredRegs.length})
            </button>
            <button className={`admin-tab ${activeTab === 'accounts' ? 'active' : ''}`} onClick={() => setActiveTab('accounts')}>
              Account Openings ({filteredAccounts.length})
            </button>
            <button className={`admin-tab ${activeTab === 'webinars' ? 'active' : ''}`} onClick={() => setActiveTab('webinars')}>
              Manage Webinars
            </button>
            <button className={`admin-tab ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
              Site Analytics
            </button>
          </div>
          <div className="admin-search-wrap">
            <input 
              type="text" 
              placeholder="Search by name, email, phone, state or PAN..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="admin-search-input"
            />
          </div>
        </div>

        {loading ? (
          <div className="admin-loader">Loading records from database...</div>
        ) : activeTab === 'contacts' ? (
          <div className="admin-table-container">
            {filteredContacts.length === 0 ? (
              <div className="admin-empty">No contact leads found matching search.</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Message</th>
                    <th>Submitted At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map(c => (
                    <tr key={c.id}>
                      <td>#{c.id}</td>
                      <td className="bold">{c.name}</td>
                      <td><a href={`mailto:${c.email}`}>{c.email}</a></td>
                      <td>{c.phone || '-'}</td>
                      <td className="message-cell">{c.message || '-'}</td>
                      <td>{new Date(c.timestamp).toLocaleString()}</td>
                      <td>
                        <button className="delete-btn" onClick={() => handleDelete('contact', c.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : activeTab === 'registrations' ? (
          <div className="admin-table-container">
            {filteredRegs.length === 0 ? (
              <div className="admin-empty">No webinar registrations found matching search.</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Webinar Topic</th>
                    <th>Webinar Date</th>
                    <th>Registered At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegs.map(r => (
                    <tr key={r.id}>
                      <td>#{r.id}</td>
                      <td className="bold">{r.name}</td>
                      <td><a href={`mailto:${r.email}`}>{r.email}</a></td>
                      <td>{r.phone || '-'}</td>
                      <td className="topic-cell">{r.topic}</td>
                      <td>{r.date}</td>
                      <td>{new Date(r.timestamp).toLocaleString()}</td>
                      <td>
                        <button className="delete-btn" onClick={() => handleDelete('registration', r.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : activeTab === 'accounts' ? (
          <div className="admin-table-container">
            {filteredAccounts.length === 0 ? (
              <div className="admin-empty">No account opening applications found matching search.</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>PAN</th>
                    <th>Aadhaar</th>
                    <th>Date of Birth</th>
                    <th>State/City</th>
                    <th>Applied At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.map(a => (
                    <tr key={a.id}>
                      <td>#{a.id}</td>
                      <td className="bold">{a.name}</td>
                      <td><a href={`mailto:${a.email}`}>{a.email}</a></td>
                      <td>{a.phone}</td>
                      <td className="bold" style={{ letterSpacing: '0.5px' }}>{a.pan}</td>
                      <td>•••• •••• {a.aadhaar ? a.aadhaar.slice(-4) : ''}</td>
                      <td>{a.dob}</td>
                      <td>{a.state}</td>
                      <td>{new Date(a.timestamp).toLocaleString()}</td>
                      <td>
                        <button className="delete-btn" onClick={() => handleDelete('account', a.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : activeTab === 'webinars' ? (
          <WebinarManageTab authHeader={sessionStorage.getItem('scsl_admin_auth') || ''} allRegistrations={leads.registrations} />
        ) : null}

        {activeTab === 'analytics' && (
          <div className="admin-list">
            <h3 style={{ padding: '20px', color: 'var(--navy)' }}>Site Analytics</h3>
            <div className="analytics-grid" style={{ padding: '0 20px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              
              <div className="analytics-column" style={{ flex: 1, minWidth: '300px' }}>
                <h4 style={{ marginBottom: '15px' }}>Recent Page Views</h4>
                {leads.page_views?.length === 0 ? (
                  <div className="admin-empty">No visits recorded yet.</div>
                ) : (
                  leads.page_views?.map(v => (
                    <div key={v.id} className="admin-card" style={{ background: '#f8f9fa', padding: '15px', borderRadius: '10px', marginBottom: '10px', borderLeft: '4px solid #49cd7a' }}>
                      <div className="ac-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <strong style={{ fontSize: '1.1rem' }}>{v.page_url}</strong>
                        <span className="ac-date" style={{ color: '#666', fontSize: '0.85rem' }}>{new Date(v.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="ac-body" style={{ fontSize: '0.9rem', color: '#444' }}>
                        <p style={{ margin: '4px 0' }}><strong>IP:</strong> {v.ip_address} | <strong>Device:</strong> {v.device}</p>
                        <p style={{ margin: '4px 0' }}><strong>OS/Browser:</strong> {v.os} / {v.browser}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="analytics-column" style={{ flex: 1, minWidth: '300px' }}>
                <h4 style={{ marginBottom: '15px' }}>Admin Logins</h4>
                {leads.logins?.length === 0 ? (
                  <div className="admin-empty">No logins recorded yet.</div>
                ) : (
                  leads.logins?.map(l => (
                    <div key={l.id} className="admin-card" style={{ background: '#f8f9fa', padding: '15px', borderRadius: '10px', marginBottom: '10px', borderLeft: '4px solid #3366cc' }}>
                      <div className="ac-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <strong style={{ fontSize: '1.1rem' }}>User: {l.username}</strong>
                        <span className="ac-date" style={{ color: '#666', fontSize: '0.85rem' }}>{new Date(l.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="ac-body" style={{ fontSize: '0.9rem', color: '#444' }}>
                        <p style={{ margin: '4px 0' }}><strong>IP:</strong> {l.ip_address} | <strong>Status:</strong> {l.status}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          </div>
        )}

      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   12. WEBINAR REGISTRATION MODAL
   ═══════════════════════════════════════════════ */
function WebinarRegistrationModal({ webinar, onClose }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [otp, setOtp] = useState('');
  const [paymentUtr, setPaymentUtr] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/register/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email })
      });
      if (res.ok) {
        setStep(2);
      } else {
        const data = await res.json();
        alert(data.detail || 'Failed to send OTP. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to backend server.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtpStep = (e) => {
    e.preventDefault();
    if (otp.trim().length !== 6) {
      alert('Please enter a valid 6-digit OTP.');
      return;
    }
    if (webinar.is_paid) {
      setStep(3);
    } else {
      handleRegisterSubmit(otp, '');
    }
  };

  const handleRegisterSubmit = async (otpValue, utrValue) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          webinar_id: webinar.id,
          topic: webinar.topic,
          date: `${webinar.date} · ${webinar.time}`,
          otp: otpValue,
          payment_utr: utrValue
        })
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json();
        alert(data.detail || 'Invalid OTP or Registration failed. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to backend server.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    if (webinar.payment_utr_required && !paymentUtr.trim()) {
      alert('Please enter your transaction UPI Ref / UTR number.');
      return;
    }
    handleRegisterSubmit(otp, paymentUtr);
  };

  const renderStepIndicator = () => {
    const stepsList = [
      { num: 1, label: 'Info' },
      { num: 2, label: 'OTP' }
    ];
    if (webinar.is_paid) {
      stepsList.push({ num: 3, label: 'Payment' });
    }
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 24px auto', maxWidth: '360px', gap: '8px' }}>
        {stepsList.map((s, idx) => (
          <React.Fragment key={s.num}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%',
                background: step === s.num ? 'var(--blue)' : step > s.num ? '#16a34a' : '#e2e8f0',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 700
              }}>
                {step > s.num ? '✓' : s.num}
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: step === s.num ? 700 : 500, color: step === s.num ? 'var(--navy)' : 'var(--muted)' }}>
                {s.label}
              </span>
            </div>
            {idx < stepsList.length - 1 && (
              <div style={{ flex: 1, height: '2px', background: step > s.num ? '#16a34a' : '#e2e8f0', minWidth: '15px' }} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="modal-overlay">
      <motion.div className="modal-content" style={{ maxWidth: step === 3 ? '520px' : '450px' }} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
        <button className="modal-close" onClick={onClose} aria-label="Close modal"><X size={20} /></button>
        
        {!success && renderStepIndicator()}

        {success ? (
          <div className="modal-success-state">
            <CheckCircle size={56} className="success-icon" />
            <h3>Seat Reserved Successfully!</h3>
            <p>You have registered for <strong>{webinar.topic}</strong>.</p>
            <p className="modal-date-info">📅 {webinar.date} at {webinar.time}</p>
            {webinar.is_paid ? (
              <p className="modal-email-note" style={{ color: '#d97706', fontWeight: 600 }}>Your payment transaction is under review. Joining details will be verified shortly.</p>
            ) : (
              <p className="modal-email-note">A confirmation email has been sent with meeting details.</p>
            )}
            <button className="btn-solid modal-done-btn" onClick={onClose}>Close Window</button>
          </div>
        ) : step === 1 ? (
          <form className="modal-form" onSubmit={handleRequestOtp}>
            <h3>Register for Webinar</h3>
            <p className="modal-sub">{webinar.is_paid ? 'Join this premium session today.' : 'Secure your free seat for this live session.'}</p>
            <div className="modal-webinar-details" style={{ borderLeft: webinar.is_paid ? '4px solid #d97706' : '4px solid var(--blue)' }}>
              <p className="topic"><strong>Topic:</strong> {webinar.topic}</p>
              <p className="date"><strong>Schedule:</strong> {webinar.date} · {webinar.time}</p>
              {webinar.is_paid && <p className="price" style={{ color: '#d97706', fontWeight: 700, margin: '4px 0 0 0' }}>💳 Fee: ₹{webinar.fee_amount}</p>}
            </div>
            <div className="mform-group">
              <label>Full Name *</label>
              <input type="text" placeholder="Enter your full name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} disabled={submitting} />
            </div>
            <div className="mform-group">
              <label>Email Address *</label>
              <input type="email" placeholder="name@domain.com" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} disabled={submitting} />
            </div>
            <div className="mform-group">
              <label>Phone Number *</label>
              <input type="tel" placeholder="10-digit mobile number" required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} disabled={submitting} />
            </div>
            <button type="submit" className="btn-primary-lg modal-submit" disabled={submitting}>
              {submitting ? 'Sending OTP...' : 'Proceed to Verify'}
            </button>
          </form>
        ) : step === 2 ? (
          <form className="modal-form" onSubmit={handleVerifyOtpStep}>
            <h3>OTP Verification</h3>
            <p className="modal-sub">A 6-digit OTP has been sent to <strong>{form.email}</strong></p>
            <div className="mform-group">
              <label>Enter 6-Digit OTP *</label>
              <input type="text" maxLength="6" placeholder="______" required value={otp} onChange={e => setOtp(e.target.value)} disabled={submitting} style={{ letterSpacing: '8px', fontSize: '1.4rem', textAlign: 'center', fontWeight: 'bold' }} />
            </div>
            <button type="submit" className="btn-primary-lg modal-submit" disabled={submitting}>
              {submitting ? 'Verifying...' : webinar.is_paid ? 'Proceed to Payment' : 'Complete Registration'}
            </button>
            <button type="button" className="btn-secondary-lg w-full mt-2" onClick={() => setStep(1)} disabled={submitting}>Back</button>
          </form>
        ) : (
          <form className="modal-form" onSubmit={handlePaymentSubmit}>
            <h3>Webinar Payment</h3>
            <p className="modal-sub">Scan the QR code below to make payment of ₹{webinar.fee_amount}.</p>
            
            <div className="payment-box" style={{ background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: '12px', padding: '16px', textAlign: 'center', margin: '12px 0' }}>
              <span style={{ background: '#fef3c7', color: '#d97706', padding: '6px 14px', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 800 }}>
                💳 Fee Amount: ₹{webinar.fee_amount}
              </span>
              
              <div style={{ margin: '14px auto', maxWidth: '180px', background: 'white', padding: '8px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                <img src="/phonepe-qr.png" alt="PhonePe QR Code" style={{ width: '100%', height: 'auto', display: 'block' }} />
              </div>
              
              <p style={{ margin: '0 0 2px 0', fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>UPI Payee Name:</p>
              <p style={{ margin: '0', fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy)' }}>Mr KOPPISETTI VENKATASIVA RAMAKRISHNA</p>
            </div>
            
            <div className="mform-group">
              <label>Transaction UPI Ref / UTR Number {webinar.payment_utr_required ? '*' : '(Optional)'}</label>
              <input 
                type="text" 
                placeholder="12-digit transaction ID (e.g. 3081...)" 
                required={webinar.payment_utr_required} 
                value={paymentUtr} 
                onChange={e => setPaymentUtr(e.target.value.replace(/\D/g, '').slice(0, 12))} 
                disabled={submitting} 
              />
              <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '4px', lineHeight: '1.2' }}>UPI Ref / UTR is a 12-digit number found in your payment app confirmation screen.</p>
            </div>
            
            <button type="submit" className="btn-primary-lg modal-submit" disabled={submitting}>
              {submitting ? 'Verifying & Completing...' : 'Verify & Complete Registration'}
            </button>
            <button type="button" className="btn-secondary-lg w-full mt-2" onClick={() => setStep(2)} disabled={submitting}>Back to OTP</button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

function OpenAccountModal({ onClose }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    pan: '',
    aadhaar: '',
    dob: '',
    state: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/open-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json();
        alert(data.detail || 'Failed to submit account opening request.');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to backend server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <motion.div className="modal-content" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ maxWidth: '520px' }}>
        <button className="modal-close" onClick={onClose} aria-label="Close modal"><X size={20} /></button>
        {success ? (
          <div className="modal-success-state" style={{ textAlign: 'center', padding: '20px' }}>
            <CheckCircle size={56} className="success-icon" style={{ color: 'var(--accent)', marginBottom: '15px' }} />
            <h3 style={{ fontSize: '1.6rem', color: 'var(--navy)', marginBottom: '10px' }}>Application Submitted!</h3>
            <p style={{ color: '#555', marginBottom: '10px' }}>Thank you <strong>{form.name}</strong>. Your Demat & Trading account opening application has been received.</p>
            <p className="modal-email-note" style={{ color: '#888', fontSize: '0.9rem', marginBottom: '20px' }}>Our verification team will review your PAN/Aadhaar details and contact you shortly.</p>
            <button className="btn-solid modal-done-btn" onClick={onClose} style={{ width: '100%' }}>Close Window</button>
          </div>
        ) : (
          <form className="modal-form" onSubmit={handleSubmit}>
            <h3>Open Demat & Trading Account</h3>
            <p className="modal-sub">Quick, paperless, and secure onboarding.</p>
            
            <div className="mform-group">
              <label>Full Name *</label>
              <input type="text" placeholder="As per PAN Card" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} disabled={submitting} />
            </div>
            
            <div className="modal-grid-2">
              <div className="mform-group">
                <label>Email Address *</label>
                <input type="email" placeholder="name@domain.com" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} disabled={submitting} />
              </div>
              <div className="mform-group">
                <label>Phone Number *</label>
                <input type="tel" placeholder="10-digit mobile number" required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} disabled={submitting} />
              </div>
            </div>

            <div className="modal-grid-2">
              <div className="mform-group">
                <label>PAN Card Number *</label>
                <input type="text" placeholder="ABCDE1234F" required pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}" title="Please enter a valid PAN (e.g. ABCDE1234F)" value={form.pan} onChange={e => setForm({ ...form, pan: e.target.value.toUpperCase() })} disabled={submitting} />
              </div>
              <div className="mform-group">
                <label>Aadhaar Number *</label>
                <input type="text" placeholder="12-digit Aadhaar" required pattern="[0-9]{12}" title="Please enter a 12-digit Aadhaar number" value={form.aadhaar} onChange={e => setForm({ ...form, aadhaar: e.target.value })} disabled={submitting} />
              </div>
            </div>

            <div className="modal-grid-2">
              <div className="mform-group">
                <label>Date of Birth *</label>
                <input type="date" required value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} disabled={submitting} />
              </div>
              <div className="mform-group">
                <label>State *</label>
                <input type="text" placeholder="State/City" required value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} disabled={submitting} />
              </div>
            </div>

            <button type="submit" className="btn-primary-lg modal-submit" disabled={submitting} style={{ marginTop: '15px' }}>
              {submitting ? 'Submitting Details...' : 'Submit Application'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   13. FOOTER
   ═══════════════════════════════════════════════ */
function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <div className="footer-logo">
            <img src="https://www.steelcitynettrade.com/images/Steelcity-logo.png" alt="Steel City Logo" style={{ height: '45px' }} />
          </div>
          <p>Your trusted financial partner since 1995. NSE & MSEI listed. ISO 9001:2015 certified.</p>
          <div className="footer-socials"><a href="#" className="fsoc">f</a><a href="#" className="fsoc">in</a><a href="#" className="fsoc">t</a><a href="#" className="fsoc">yt</a></div>
        </div>
        <div className="footer-col"><h5>Quick Links</h5><ul><li><a href="#home">Home</a></li><li><a href="#webinars">Webinars</a></li><li><a href="#services">Services</a></li><li><a href="#journey">Journey</a></li><li><a href="#about">About Us</a></li><li><a href="#contact">Contact</a></li></ul></div>
        <div className="footer-col"><h5>Services</h5><ul><li><a href="#services">Stock Broking</a></li><li><a href="#services">e-Governance / PAN</a></li><li><a href="#services">Depository (DP)</a></li><li><a href="#services">NBFC Loans</a></li><li><a href="#services">NPS & Insurance</a></li></ul></div>
        <div className="footer-col"><h5>Contact</h5><ul><li>Steel City Heights, Vizag</li><li>+91 0891-2563581</li><li>scsl@steelcitynettrade.com</li><li>Mon–Sat: 09:00 – 18:00</li></ul></div>
      </div>
      <div className="footer-bottom container">
        <p>© 2026 Steel City Securities Limited. All rights reserved.</p>
        <div className="footer-bottom-links">
          <a href="#leads" className="admin-db-link">Admin Dashboard</a>
          <a href="#">Privacy Policy</a>
          <a href="#">Disclaimer</a>
          <a href="#">Investor Charter</a>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════
   14. FLOATING CTA
   ═══════════════════════════════════════════════ */
function FloatingCTA() {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 3000); return () => clearTimeout(t); }, []);
  if (!show) return null;
  return (
    <motion.a href="#webinars" className="floating-cta" initial={{ opacity: 0, scale: 0.8, x: 100 }} animate={{ opacity: 1, scale: 1, x: 0 }} transition={{ type: 'spring' }}>
      <Calendar size={14} /><span>Register for Free Webinar</span>
    </motion.a>
  );
}

/* ═══════════════════════════════════════════════
   APP ROOT
   ═══════════════════════════════════════════════ */
export default function App() {
  const [page, setPage] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return ['home', 'webinars', 'services', 'hub', 'journey', 'about', 'contact', 'leads'].includes(hash) ? hash : 'home';
  });
  
  const [registeringWebinar, setRegisteringWebinar] = useState(null);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['home', 'webinars', 'services', 'hub', 'journey', 'about', 'contact', 'leads'].includes(hash)) {
        setPage(hash);
        window.scrollTo(0, 0);
      } else if (hash === '') {
        setPage('home');
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    // Track Page View
    fetch(`${API_BASE_URL}/api/track/pageview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_url: `/${page}` })
    }).catch(err => console.error("Tracking failed:", err));

    // Track Login specifically when admin dashboard is accessed
    if (page === 'leads') {
      fetch(`${API_BASE_URL}/api/track/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: "admin", status: "SUCCESS" })
      }).catch(err => console.error("Tracking failed:", err));
    }
  }, [page]);

  const [showOpenAccount, setShowOpenAccount] = useState(false);

  return (
    <>
      <MarketTicker />
      <Navbar activePage={page} onOpenAccountClick={() => setShowOpenAccount(true)} />
      <main className="main-content">
        {page === 'home' && (
          <>
            <Hero onOpenAccountClick={() => setShowOpenAccount(true)} />
            <WhyWebinars />
            <Services limit={3} />
            <Testimonials />
          </>
        )}
        {page === 'webinars' && <WebinarSchedule onRegisterClick={setRegisteringWebinar} />}
        {page === 'services' && <Services />}
        {page === 'hub' && <ServicesHub />}
        {page === 'journey' && <Journey />}
        {page === 'about' && <About />}
        {page === 'contact' && <Contact />}
        {page === 'leads' && <LeadsAdminPage />}
      </main>
      <Footer />
      <FloatingCTA />
      
      <AnimatePresence>
        {registeringWebinar && (
          <WebinarRegistrationModal 
            webinar={registeringWebinar} 
            onClose={() => setRegisteringWebinar(null)} 
          />
        )}
        {showOpenAccount && (
          <OpenAccountModal 
            onClose={() => setShowOpenAccount(false)} 
          />
        )}
      </AnimatePresence>
    </>
  );
}
