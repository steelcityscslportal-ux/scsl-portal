import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, ShieldCheck, UserPlus, Globe, PhoneCall,
  ChevronRight, TrendingUp, Award, Mail, MapPin,
  Menu, X, ArrowRight, CheckCircle, Star,
  Landmark, Coins, PiggyBank, Calendar, Users, Video,
  Briefcase, Rocket, UserCheck, FileText, Laptop,
  CreditCard, Activity, Search, Network, GraduationCap,
  Home, BookOpen, Shield, Newspaper, Clock, RefreshCw,
  TrendingDown, Compass
} from 'lucide-react';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:8000' 
    : 'https://scsl-backend.onrender.com');

/* ═══════════════════════════════════════════════
   RELATIVE TIME UTILITIES
   Formats dates and times to "X mins/hours ago"
   ═══════════════════════════════════════════════ */
const parseNewsDateTime = (dateStr, timeStr) => {
  if (!dateStr) return new Date();
  const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const parts = dateStr.split(' ');
  let day = 1, month = 0, year = new Date().getFullYear();
  if (parts.length === 3) {
    day = parseInt(parts[0], 10);
    month = months[parts[1]] || 0;
    year = parseInt(parts[2], 10);
  }
  let hours = 0, minutes = 0;
  if (timeStr) {
    const timeParts = timeStr.split(':');
    if (timeParts.length === 2) {
      hours = parseInt(timeParts[0], 10);
      minutes = parseInt(timeParts[1], 10);
    }
  }
  return new Date(year, month, day, hours, minutes);
};

const getRelativeTime = (dateStr, timeStr) => {
  try {
    const newsDate = parseNewsDateTime(dateStr, timeStr);
    const now = new Date();
    const diffMs = now.getTime() - newsDate.getTime();
    if (diffMs < 0) return 'just now';
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'yesterday';
    return `${diffDays}d ago`;
  } catch (e) {
    return timeStr ? `${timeStr} - ${dateStr}` : dateStr || '';
  }
};

/* ═══════════════════════════════════════════════
   NEWS TICKER (Auto-scrolling news channel style)
   ═══════════════════════════════════════════════ */
function NewsTicker({ items, onSelect }) {
  if (!items || items.length === 0) return null;
  const marqueeItems = [...items, ...items, ...items];
  return (
    <div className="news-ticker-bar">
      <div className="news-ticker-label">
        <span className="live-indicator-pulse"></span>
        <span>BREAKING NEWS</span>
      </div>
      <div className="news-ticker-wrap">
        <div className="news-ticker-inner">
          {marqueeItems.map((item, idx) => (
            <span 
              key={`${item.id}-${idx}`} 
              className="news-ticker-item" 
              onClick={() => onSelect(item)}
            >
              <span className="ticker-sec-badge">{item.section || "Live"}</span>
              <span className="ticker-headline">{item.heading}</span>
              <span className="ticker-time-badge">{getRelativeTime(item.date, item.time)}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   KEEP-ALIVE: Pings backend every 14 minutes to
   prevent Render free tier from sleeping
   ═══════════════════════════════════════════════ */
function useKeepAlive() {
  useEffect(() => {
    // Ping immediately on load to wake backend early
    fetch(`${API_BASE_URL}/api/health`).catch(() => {});
    // Then ping every 14 minutes (Render sleeps after 15 min)
    const id = setInterval(() => {
      fetch(`${API_BASE_URL}/api/health`).catch(() => {});
    }, 14 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
}

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
  { label: 'Live News', href: '#news' },
  { label: 'Markets', href: '#market-search' },
  { label: 'Webinars', href: '#webinars' },
  { label: 'Services', href: '#services' },
  { label: 'Services Hub', href: '#hub' },
  { label: 'Journey', href: '#journey' },
  { label: 'About Us', href: '#about' },
  { label: 'CRM', href: '#crm' },
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
              <a key={n.label} href={n.href} className={isActive ? 'active' : ''} style={{ display: 'inline-flex', alignItems: 'center' }}>
                {n.label}
                {n.label === 'CRM' && <span className="crm-nav-new-badge">New</span>}
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
              <a key={n.label} href={n.href} className={activePage === n.href.replace('#', '') ? 'active' : ''} onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {n.label}
                {n.label === 'CRM' && <span className="crm-nav-new-badge" style={{ marginLeft: '6px' }}>New</span>}
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
   3a. TRUST STATS BAR (FULL-WIDTH BLUE SECTION)
   ═══════════════════════════════════════════════ */
function TrustStatsItem({ target, suffix, label, icon: Icon }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        let start = 0;
        const duration = 2000;
        const step = target / (duration / 16);
        const timer = setInterval(() => {
          start += step;
          if (start >= target) {
            setCount(target);
            clearInterval(timer);
          } else {
            setCount(Math.floor(start));
          }
        }, 16);
      }
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  const displayCount = target >= 10000 ? count.toLocaleString('en-IN') : count;

  return (
    <div className="trust-stat-card" ref={ref}>
      <div className="trust-stat-icon-wrap">
        <Icon size={26} />
      </div>
      <div className="trust-stat-content">
        <span className="trust-stat-num">{displayCount}{suffix}</span>
        <span className="trust-stat-lbl">{label}</span>
      </div>
    </div>
  );
}

function TrustStatsBar({ cmsContent = {} }) {
  const target1 = parseInt(cmsContent.trust_stat1_num) || 31;
  const suffix1 = cmsContent.trust_stat1_suffix !== undefined ? cmsContent.trust_stat1_suffix : "+";
  const label1 = cmsContent.trust_stat1_lbl || "Years of Trust";

  const target2 = parseInt(cmsContent.trust_stat2_num) || 400000;
  const suffix2 = cmsContent.trust_stat2_suffix !== undefined ? cmsContent.trust_stat2_suffix : "+";
  const label2 = cmsContent.trust_stat2_lbl || "Investors Served";

  const target3 = parseInt(cmsContent.trust_stat3_num) || 420;
  const suffix3 = cmsContent.trust_stat3_suffix !== undefined ? cmsContent.trust_stat3_suffix : "+";
  const label3 = cmsContent.trust_stat3_lbl || "Pan India Locations";

  const target4 = parseInt(cmsContent.trust_stat4_num) || 22;
  const suffix4 = cmsContent.trust_stat4_suffix !== undefined ? cmsContent.trust_stat4_suffix : "";
  const label4 = cmsContent.trust_stat4_lbl || "States (e-Gov)";

  return (
    <section className="trust-stats-section">
      <div className="container trust-stats-grid">
        <TrustStatsItem target={target1} suffix={suffix1} label={label1} icon={Award} />
        <TrustStatsItem target={target2} suffix={suffix2} label={label2} icon={Users} />
        <TrustStatsItem target={target3} suffix={suffix3} label={label3} icon={MapPin} />
        <TrustStatsItem target={target4} suffix={suffix4} label={label4} icon={Globe} />
      </div>
    </section>
  );
}


/* ═══════════════════════════════════════════════
   3. HERO SECTION (HOME PAGE ONLY)
   ═══════════════════════════════════════════════ */
function Hero({ onOpenAccountClick, cmsContent = {} }) {
  const slides = [
    {
      badge: cmsContent.hero_slide1_badge || "🎓 Absolutely Free Online Training",
      title: cmsContent.hero_slide1_title || "FREE STOCK MARKET TRAINING PROGRAM",
      subtitle: cmsContent.hero_slide1_subtitle || "Exclusively For New Investors, Beginners & Aspiring Traders",
      desc: cmsContent.hero_slide1_desc || "Learn the fundamentals of stock market investing, trading, technical analysis, risk management, and wealth creation from experienced market professionals.",
      image: cmsContent.hero_slide1_image || "/slide1.png",
      titleSize: cmsContent.hero_slide1_title_size || undefined
    },
    {
      badge: cmsContent.hero_slide2_badge || "💻 Interactive Live Webinars",
      title: cmsContent.hero_slide2_title || "FREE LIVE INVESTOR AWARENESS MEETINGS",
      subtitle: cmsContent.hero_slide2_subtitle || "Secure Your Seat For Real-Time Strategy Sessions",
      desc: cmsContent.hero_slide2_desc || "Join live online sessions, interactive meetings, and live platform walkthroughs. Get all your doubts resolved in real-time.",
      image: cmsContent.hero_slide2_image || "/slide2.png",
      titleSize: cmsContent.hero_slide2_title_size || undefined
    },
    {
      badge: cmsContent.hero_slide3_badge || "🏆 Expert Research Advisors",
      title: cmsContent.hero_slide3_title || "LEARN FROM SKILLED MARKET MENTORS",
      subtitle: cmsContent.hero_slide3_subtitle || "Direct Guidance from SEBI Registered Research Analysts",
      desc: cmsContent.hero_slide3_desc || "Get trained by seasoned advisors who guide you step-by-step through technical indicators, trading charts, and disciplined investing habits.",
      image: cmsContent.hero_slide3_image || "/slide3.png",
      titleSize: cmsContent.hero_slide3_title_size || undefined
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
      <div className="container">
        <div className="hero-grid">
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
                    <h2 className="slide-title" style={slides[slideIndex].titleSize ? { fontSize: slides[slideIndex].titleSize } : undefined}>
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
          </motion.div>

          <motion.div className="hero-visual" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, delay: 0.2 }}>
            <div className="ceo-float-card">
              <div className="ceo-img-wrap"><img src={cmsContent.ceo_image || "/ceo.png"} alt="Satish Kumar Arya – MD & CEO, SCSL" /></div>
              <div className="ceo-details">
                <p className="ceo-name">{cmsContent.ceo_name || "Satish Kumar Arya"}</p>
                <p className="ceo-title">{cmsContent.ceo_title || "Managing Director & CEO"}</p>
                <p className="ceo-quote">{cmsContent.ceo_quote || '"Building wealth, building trust — for every Indian investor."'}</p>
              </div>
            </div>
          </motion.div>
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

          <div className="htp-split-layout">
            <div className="htp-split-left">
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
            </div>

            <div className="htp-split-right">
              <div className="htp-who">
                <span className="htp-who-label">👥 Who Should Attend?</span>
                <div className="htp-who-tags">
                  {["New Traders", "Working Professionals", "Students", "Business Owners", "Housewives", "Existing Investors"].map(t => (
                    <span key={t} className="htp-who-tag">{t}</span>
                  ))}
                </div>
              </div>

              <div className="hero-actions">
                <button onClick={onOpenAccountClick} className="btn-primary-lg" style={{ border: 'none', cursor: 'pointer' }}>Open Trading Account <ChevronRight size={20} /></button>
                <a href="#webinars" className="btn-secondary-lg">Register Free Now</a>
              </div>

              <div className="exchange-badges">
                {['NSE', 'BSE', 'MCX', 'NSDL', 'CDSL', 'NCDEX'].map(e => <span key={e} className="exch-badge">{e}</span>)}
              </div>
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
          const now = new Date();
          // Filter out completed sessions based on start_time
          const upcoming = data.filter(w => {
            if (!w.start_time) return true; // keep if admin didn't specify start_time
            return new Date(w.start_time) >= now;
          });
          setWebinars(upcoming);
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
            <div className="webinar-skeleton-list">
              {[1,2,3,4].map(i => (
                <div key={i} className="wtm-row wtm-skeleton-row">
                  <div className="wtm-cell wtm-trainer">
                    <div className="skel skel-avatar" />
                    <div style={{ flex: 1 }}>
                      <div className="skel skel-line" style={{ width: '70%' }} />
                      <div className="skel skel-line" style={{ width: '45%', marginTop: 6 }} />
                    </div>
                  </div>
                  <div className="wtm-cell"><div className="skel skel-badge" /></div>
                  <div className="wtm-cell"><div className="skel skel-line" style={{ width: '60%' }} /></div>
                  <div className="wtm-cell"><div className="skel skel-line" style={{ width: '80%' }} /></div>
                  <div className="wtm-cell"><div className="skel skel-btn" /></div>
                </div>
              ))}
            </div>
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

function WhyWebinars({ cmsContent = {} }) {
  const features = [
    {
      title: cmsContent.why_card1_title || "Why Watch SCSL Webinars?",
      icon: Video,
      color: "var(--sky)",
      points: [
        cmsContent.why_card1_p1 || "Learn directly from SEBI-registered research analysts with decades of hands-on experience.",
        cmsContent.why_card1_p2 || "See live market charting, live trade setups, and real-time execution methods.",
        cmsContent.why_card1_p3 || "Get direct access to Q&A sessions to clarify your specific portfolio and trading queries."
      ]
    },
    {
      title: cmsContent.why_card2_title || "Why Register in Advance?",
      icon: Calendar,
      color: "#FFD700",
      points: [
        cmsContent.why_card2_p1 || "Secure priority seat reservation as live session rooms have limited capacity.",
        cmsContent.why_card2_p2 || "Receive custom trading templates, strategy spreadsheets, and market cheatsheets.",
        cmsContent.why_card2_p3 || "Get the full HD recorded session and summary notes sent directly to your inbox."
      ]
    },
    {
      title: cmsContent.why_card3_title || "What is the Practical Use?",
      icon: TrendingUp,
      color: "var(--green)",
      points: [
        cmsContent.why_card3_p1 || "Master risk-reward ratios, stop-loss strategy, and emotional discipline.",
        cmsContent.why_card3_p2 || "Build standalone trading plans for intraday, swing trading, and investing.",
        cmsContent.why_card3_p3 || "Receive post-webinar support and guidance from the SCSL support team."
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
          <span className="section-tag" style={{ background: 'rgba(135, 206, 235, 0.15)', color: 'var(--sky)' }}>{cmsContent.why_webinars_tag || "Investor Empowerment"}</span>
          <h2 className="section-title" style={{ color: 'var(--white)' }}>{cmsContent.why_webinars_title || "Why Choose SCSL Webinars?"}</h2>
          <p className="section-sub" style={{ color: 'rgba(255, 255, 255, 0.7)', margin: '12px auto 0' }}>
            {cmsContent.why_webinars_sub || "Transform your understanding of the financial markets with professional guidance and actionable insights."}
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

/* ═══════════════════════════════════════════════
   LIVE NEWS SECTION (Real-time data from CM API)
   ═══════════════════════════════════════════════ */
function LiveNews({ isFullPage = false }) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNews, setSelectedNews] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSection, setSelectedSection] = useState("All");

  const [detailedNews, setDetailedNews] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNews = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/live-news`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setNews(data);
        } else {
          console.error("News data is not an array:", data);
        }
      } else {
        console.error("Failed to fetch news, status:", res.status);
      }
    } catch (err) {
      console.error("Failed to fetch news:", err);
    } finally {
      setLoading(false);
      if (showRefreshIndicator) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
    const interval = setInterval(() => fetchNews(false), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedNews) {
      setDetailedNews(null);
      return;
    }
    const fetchDetail = async () => {
      setLoadingDetail(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/live-news/${selectedNews.id}`);
        if (res.ok) {
          const data = await res.json();
          setDetailedNews(data);
        } else {
          console.error("Failed to fetch detail");
        }
      } catch (err) {
        console.error("Error fetching detail:", err);
      } finally {
        setLoadingDetail(false);
      }
    };
    fetchDetail();
  }, [selectedNews]);

  const handleManualRefresh = () => {
    fetchNews(true);
  };

  if (loading) {
    return (
      <section className={isFullPage ? "live-news-page-loading" : "live-news-section"}>
        <div className="container">
          <div className="section-header-center">
            <span className="live-news-tag">
              <span className="live-indicator-pulse"></span> LIVE MARKET NEWS
            </span>
            <h2 className="live-news-title">Pulse of the Financial Markets</h2>
          </div>
          <div className="live-news-loading">
            <div className="news-spinner"></div>
            <p>Fetching real-time market updates...</p>
          </div>
        </div>
      </section>
    );
  }

  if (news.length === 0) {
    if (isFullPage) {
      return (
        <section className="live-news-page-section">
          <div className="container" style={{ textAlign: 'center', padding: '80px 20px' }}>
            <span className="live-news-tag">
              <span className="live-indicator-pulse"></span> SYSTEM ERROR
            </span>
            <h2 className="live-news-title" style={{ marginTop: '20px' }}>Unable to load live market news</h2>
            <p className="live-news-sub">We could not fetch the latest market bulletins. Please verify your connection or try again shortly.</p>
            <button 
              className="btn-solid" 
              onClick={() => window.location.reload()} 
              style={{ marginTop: '30px', padding: '12px 30px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              Retry Connection
            </button>
          </div>
        </section>
      );
    }
    return null;
  }

  // Filter logic for full page
  const filteredNews = news.filter(item => {
    const matchesSearch = 
      (item.heading && item.heading.toLowerCase().includes(searchTerm.toLowerCase())) || 
      (item.caption && item.caption.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSection = selectedSection === "All" || item.section === selectedSection;
    return matchesSearch && matchesSection;
  });

  const sections = ["All", ...new Set(news.map(item => item.section).filter(Boolean))];

  if (isFullPage) {
    return (
      <section className="live-news-page-section">
        <div className="news-page-bg">
          <div className="news-bg-bubble" style={{ width: '400px', height: '400px', top: '10%', right: '5%' }}></div>
          <div className="news-bg-bubble" style={{ width: '300px', height: '300px', bottom: '20%', left: '5%', animationDelay: '-5s' }}></div>
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="section-header-center">
            <span className="live-news-tag">
              <span className="live-indicator-pulse"></span> LIVE BROADCAST
            </span>
            <h1 className="live-news-title">Pulse of the Financial Markets</h1>
            <p className="live-news-sub">Real-time market bulletins, IPO updates, corporate earnings, and key macroeconomic news updated continuously 24/7.</p>
          </div>

          <NewsTicker items={news} onSelect={setSelectedNews} />

          <div className="news-filters-wrapper">
            <div className="news-search-box">
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Search headlines or descriptions..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && <button className="clear-search-btn" onClick={() => setSearchTerm("")}><X size={14} /></button>}
            </div>
            
            <button 
              className={`refresh-news-btn ${refreshing ? 'spinning' : ''}`}
              onClick={handleManualRefresh}
              title="Refresh News Feed"
              disabled={refreshing}
            >
              <RefreshCw size={18} />
            </button>

            <div className="news-section-tabs">
              {sections.map(sec => (
                <button 
                  key={sec} 
                  className={`news-tab-btn ${selectedSection === sec ? 'active' : ''}`}
                  onClick={() => setSelectedSection(sec)}
                >
                  {sec}
                </button>
              ))}
            </div>
          </div>

          {filteredNews.length === 0 ? (
            <div className="no-news-found">
              <p>No news bulletins found matching your criteria.</p>
              <button className="btn-secondary" onClick={() => { setSearchTerm(""); setSelectedSection("All"); }}>Reset Filters</button>
            </div>
          ) : (
            <div className="news-grid-layout">
              {filteredNews.map((item, idx) => (
                <motion.div 
                  layout
                  key={item.id} 
                  className="news-grid-card"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.5 }}
                  whileHover={{ y: -8, boxShadow: '0 24px 48px rgba(0, 119, 182, 0.12)' }}
                >
                  <div className="news-grid-card-header">
                    <span className="news-badge">{item.section || "Market Updates"}</span>
                    <span className="news-time" title={`${item.time} - ${item.date}`}>
                      <Clock size={12} /> {getRelativeTime(item.date, item.time)}
                    </span>
                  </div>
                  <h3 className="news-grid-card-title">{item.heading}</h3>
                  <p className="news-grid-card-excerpt">
                    {item.caption ? (item.caption.length > 180 ? `${item.caption.slice(0, 180)}...` : item.caption) : "No further details available for this bulletin."}
                  </p>
                  <button 
                    className="read-story-btn"
                    onClick={() => setSelectedNews(item)}
                  >
                    Read Full Story <ArrowRight size={14} />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <AnimatePresence>
          {selectedNews && (
            <div className="modal-overlay" onClick={() => setSelectedNews(null)}>
              <div className="modal-bg-anim">
                <div className="modal-bg-glow"></div>
              </div>
              <motion.div 
                className="news-detail-modal"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <button className="news-modal-close" onClick={() => setSelectedNews(null)}>
                  <X size={20} />
                </button>
                <div className="news-modal-header">
                  <span className="news-badge">{selectedNews.section || "Market Update"}</span>
                  <span className="news-modal-time">
                    <Calendar size={13} /> {selectedNews.date} at {selectedNews.time}
                    <span className="news-modal-relative"> ({getRelativeTime(selectedNews.date, selectedNews.time)})</span>
                  </span>
                </div>
                <h2 className="news-modal-title">{selectedNews.heading}</h2>
                <div className="news-modal-content-wrap">
                  {loadingDetail ? (
                    <div className="news-detail-skeleton">
                      <div className="skeleton-line" style={{ width: '95%' }}></div>
                      <div className="skeleton-line" style={{ width: '90%' }}></div>
                      <div className="skeleton-line" style={{ width: '92%' }}></div>
                      <div className="skeleton-line" style={{ width: '85%' }}></div>
                      <div className="skeleton-line" style={{ width: '40%' }}></div>
                    </div>
                  ) : detailedNews && (detailedNews.arttext || detailedNews.caption) ? (
                    <div className="news-detail-story">
                      {detailedNews.IllustrationImage && (
                        <div className="news-detail-img-wrap">
                          <img src={detailedNews.IllustrationImage} alt={selectedNews.heading} className="news-detail-img" onError={(e) => e.target.style.display = 'none'} />
                        </div>
                      )}
                      {detailedNews.arttext ? (
                        detailedNews.arttext.split(/<P>|<p>/g).map((para, pIdx) => {
                          const cleanPara = para.replace(/<\/p>|<\/P>/g, '').trim();
                          if (!cleanPara) return null;
                          return <p key={pIdx} className="news-detail-paragraph">{cleanPara}</p>;
                        })
                      ) : (
                        <p className="news-detail-paragraph">{detailedNews.caption}</p>
                      )}
                      {detailedNews.KeyWords && (
                        <div className="news-keywords-wrap">
                          <span className="keywords-label">Keywords:</span>
                          <div className="keywords-list">
                            {detailedNews.KeyWords.split(',').map((kw, kwIdx) => (
                              <span key={kwIdx} className="keyword-badge">{kw.trim()}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="news-modal-caption">
                      {selectedNews.caption || "No further details available for this bulletin."}
                    </p>
                  )}
                </div>
                <div className="news-modal-footer">
                  <p className="news-modal-source">Source: Capital Market Publishers</p>
                  <button className="btn-secondary" onClick={() => setSelectedNews(null)}>Close</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </section>
    );
  }

  const marqueeItems = [...news, ...news];

  return (
    <section className="live-news-section">
      <div className="container">
        <div className="section-header-center">
          <span className="live-news-tag">
            <span className="live-indicator-pulse"></span> LIVE MARKET NEWS
          </span>
          <h2 className="live-news-title">Pulse of the Financial Markets</h2>
          <p className="live-news-sub">Real-time market bulletins, IPO updates, corporate earnings, and key macroeconomic news sourced live.</p>
        </div>

        <div className="marquee-wrapper">
          <div className="marquee-fade-left"></div>
          <div className="marquee-fade-right"></div>
          <div className="marquee-container">
            <div className="marquee-track">
              {marqueeItems.map((item, idx) => (
                <div 
                  key={`${item.id}-${idx}`} 
                  className="news-card-marquee"
                  onClick={() => setSelectedNews(item)}
                >
                  <div className="news-card-top">
                    <span className="news-badge">{item.section || "Market Updates"}</span>
                    <span className="news-time">
                      <Clock size={12} /> {item.time || "Just now"}
                    </span>
                  </div>
                  <h3 className="news-card-title">{item.heading}</h3>
                  <div className="news-card-hover-hint">Click to read details</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedNews && (
          <div className="modal-overlay" onClick={() => setSelectedNews(null)}>
            <motion.div 
              className="news-detail-modal"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="news-modal-close" onClick={() => setSelectedNews(null)}>
                <X size={20} />
              </button>
              <div className="news-modal-header">
                <span className="news-badge">{selectedNews.section}</span>
                <span className="news-modal-time">
                  <Calendar size={13} /> {selectedNews.date} at {selectedNews.time}
                </span>
              </div>
              <h2 className="news-modal-title">{selectedNews.heading}</h2>
              <div className="news-modal-content-wrap">
                <p className="news-modal-caption">
                  {selectedNews.caption || "No further details available for this bulletin."}
                </p>
              </div>
              <div className="news-modal-footer">
                <p className="news-modal-source">Source: Capital Market Publishers</p>
                <button className="btn-secondary" onClick={() => setSelectedNews(null)}>Close</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}

function Services({ limit, cmsContent = {} }) {
  const dynamicServices = [
    {
      icon: BarChart3,
      color: '#0077B6',
      title: cmsContent.svc1_title || 'Stock Broking',
      desc: cmsContent.svc1_desc || 'Equity, Futures & Options, Commodities, and Currency Derivatives across NSE, BSE, MCX, NCDEX & MSEI.',
      features: [
        cmsContent.svc1_f1 || 'Equity Cash & F&O',
        cmsContent.svc1_f2 || 'Commodity & Currency',
        cmsContent.svc1_f3 || 'Research & Advisory',
        cmsContent.svc1_f4 || '24×7 Back-Office'
      ].filter(Boolean)
    },
    {
      icon: Landmark,
      color: '#0096C7',
      title: cmsContent.svc2_title || 'Depository Services',
      desc: cmsContent.svc2_desc || 'Participant of both NSDL & CDSL. Safe dematerialization and electronic transfer of securities.',
      features: [
        cmsContent.svc2_f1 || 'NSDL & CDSL DP',
        cmsContent.svc2_f2 || 'e-DIS & e-Mandate',
        cmsContent.svc2_f3 || 'Pledge & Margin',
        cmsContent.svc2_f4 || 'Nomination Facility'
      ].filter(Boolean)
    },
    {
      icon: Globe,
      color: '#00B4D8',
      title: cmsContent.svc3_title || 'e-Governance',
      desc: cmsContent.svc3_desc || 'Authorized TIN-FC centers across 22 states providing PAN, TAN, e-TDS, and AIR services.',
      features: [
        cmsContent.svc3_f1 || 'PAN Card Services',
        cmsContent.svc3_f2 || 'TAN Registration',
        cmsContent.svc3_f3 || 'e-TDS Filing',
        cmsContent.svc3_f4 || 'AIR Reporting'
      ].filter(Boolean)
    },
    {
      icon: ShieldCheck,
      color: '#48CAE4',
      title: cmsContent.svc4_title || 'Life Insurance',
      desc: cmsContent.svc4_desc || 'Corporate Agent for SBI Life Insurance — securing the financial future of your family.',
      features: [
        cmsContent.svc4_f1 || 'Term Insurance',
        cmsContent.svc4_f2 || 'ULIP Plans',
        cmsContent.svc4_f3 || 'Child Plans',
        cmsContent.svc4_f4 || 'Retirement Plans'
      ].filter(Boolean)
    },
    {
      icon: Coins,
      color: '#0077B6',
      title: cmsContent.svc5_title || 'NBFC Loan Services',
      desc: cmsContent.svc5_desc || 'Quick and hassle-free loan solutions through our registered NBFC arm.',
      features: [
        cmsContent.svc5_f1 || 'Personal Loans',
        cmsContent.svc5_f2 || 'Gold Loans',
        cmsContent.svc5_f3 || 'Business Loans',
        cmsContent.svc5_f4 || 'Loans Against Securities'
      ].filter(Boolean)
    },
    {
      icon: PiggyBank,
      color: '#0096C7',
      title: cmsContent.svc6_title || 'Investments',
      desc: cmsContent.svc6_desc || 'Mutual Funds, IPO Distribution, and National Pension System through expert wealth advisors.',
      features: [
        cmsContent.svc6_f1 || 'Mutual Funds SIP',
        cmsContent.svc6_f2 || 'IPO Applications',
        cmsContent.svc6_f3 || 'NPS (POP-PFRDA)',
        cmsContent.svc6_f4 || 'Portfolio Review'
      ].filter(Boolean)
    }
  ];

  const displayedServices = limit ? dynamicServices.slice(0, limit) : dynamicServices;
  const sectionTag = cmsContent.services_tag || "Our Expertise";
  const sectionTitle = cmsContent.services_title || "Comprehensive Financial Solutions";
  const sectionSub = cmsContent.services_sub || "One platform. Every financial need. Backed by 31 years of excellence.";

  return (
    <section className="services-section">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">{sectionTag}</span>
          <h2 className="section-title">{sectionTitle}</h2>
          <p className="section-sub">{sectionSub}</p>
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
function About({ cmsContent = {} }) {
  const tag = cmsContent.about_tag || "Our Story";
  const title = cmsContent.about_title || "Three Decades of Trusted Financial Leadership";
  const p1 = cmsContent.about_text_p1 || "Founded in 1995 by Kamireddy Satyanarayana, Steel City Securities Limited began with a singular mission: to make Indian capital markets accessible, transparent, and investor-friendly. Today, with over 31 years of industry presence, SCSL stands as a comprehensive financial powerhouse.";
  const p2 = cmsContent.about_text_p2 || "Listed on NSE and MSEI, and proudly holding ISO 9001:2015 certification, our working culture is built on \"Dedication & Trustworthiness\" — the two pillars that define every interaction.";
  const quote = cmsContent.about_quote || "\"Do Good to Do Well, and Do Well to Do Good.\"";
  const cite = cmsContent.about_quote_cite || "— SCSL Corporate Philosophy";
  const vision = cmsContent.about_vision || "Towards making the Indian Securities Market — Transparent, Efficient, and Investor Friendly.";
  const mission = cmsContent.about_mission || "To hold securities in dematerialised form and provide safe, reliable and efficient depository services.";
  const titleSize = cmsContent.about_title_size || undefined;

  return (
    <section className="about-section">
      <div className="container about-grid">
        <motion.div className="about-text" initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
          <span className="section-tag">{tag}</span>
          <h2 className="section-title" style={titleSize ? { fontSize: titleSize } : undefined} dangerouslySetInnerHTML={{ __html: title.replace(/\n/g, '<br />') }} />
          <p dangerouslySetInnerHTML={{ __html: p1 }} />
          <p style={{ marginTop: '1rem' }} dangerouslySetInnerHTML={{ __html: p2 }} />
          <blockquote className="about-quote">{quote}<cite>{cite}</cite></blockquote>
          <div className="leadership-cards">
            <div className="leader-card">
              <div className="leader-avatar">KS</div>
              <div><p className="leader-name">Kamireddy Satyanarayana</p><p className="leader-role">Founder & Executive Chairman</p></div>
            </div>
            <div className="leader-card">
              <div className="leader-avatar">SA</div>
              <div><p className="leader-name">{cmsContent.ceo_name || "Satish Kumar Arya"}</p><p className="leader-role">{cmsContent.ceo_role || "Managing Director & CEO"}</p></div>
            </div>
          </div>
        </motion.div>
        <motion.div className="about-visual" initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.2 }}>
          <div className="vision-board">
            <div className="vision-item"><h4>Our Vision</h4><p>{vision}</p></div>
            <div className="vision-item"><h4>Our Mission</h4><p>{mission}</p></div>
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
   9b. FEEDBACK & REVIEW SECTION
   ═══════════════════════════════════════════════ */
function FeedbackSection() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', rating: 5, comment: '' });
  const [hoverRating, setHoverRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [lastClickedStar, setLastClickedStar] = useState(null);

  const handleMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    const angleX = ((yc - y) / yc) * 10;
    const angleY = ((x - xc) / xc) * 10;
    card.style.setProperty('--rotate-x', `${angleX}deg`);
    card.style.setProperty('--rotate-y', `${angleY}deg`);
  };

  const handleMouseLeave = (e) => {
    const card = e.currentTarget;
    card.style.transition = 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)';
    card.style.setProperty('--rotate-x', '0deg');
    card.style.setProperty('--rotate-y', '0deg');
    setTimeout(() => { card.style.transition = ''; }, 500);
  };

  const fetchFeedbacks = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/feedback`);
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(data);
      }
    } catch (err) {
      console.error("Failed to fetch feedbacks:", err);
    }
  };

  useEffect(() => { fetchFeedbacks(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.comment.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setSubmitted(true);
        setForm({ name: '', email: '', rating: 5, comment: '' });
        fetchFeedbacks();
      } else {
        const errData = await res.json();
        setError(errData.detail || "Failed to submit feedback.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const allReviews = [
    { id: 't1', name: 'Rajesh Venkata', comment: "SCSL's research desk gives top-quality F&O calls. I've been trading with them for 8 years and the back-office is truly 24x7.", rating: 5 },
    { id: 't2', name: 'Priya Subramaniam', comment: 'As a sub-broker, the terminal support and seamless connectivity has helped me grow my client base significantly.', rating: 5 },
    { id: 't3', name: 'V. Krishna Murthy', comment: 'I trust SCSL for my NPS and Mutual Fund SIPs. The team is always professional and responsive.', rating: 5 },
    ...feedbacks
  ];

  return (
    <section className="feedback-section" id="feedback">
      <div className="container feedback-grid-layout">
        <div className="feedback-display">
          <div className="section-header align-left">
            <span className="section-tag">Client Reviews</span>
            <h2 className="section-title">Investor Experiences</h2>
            <p className="section-desc">See what our clients say about their journey with Steel City Securities Limited.</p>
          </div>
          <div className="reviews-list-container">
            {allReviews.map((review, idx) => (
              <div 
                key={review.id || `f-${idx}`} 
                className="review-item-card"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                <div className="review-header">
                  <div className="review-avatar">{review.name.charAt(0).toUpperCase()}</div>
                  <div className="review-meta">
                    <p className="review-author-name">{review.name}</p>
                    <div className="review-stars-row">
                      {Array(5).fill(0).map((_, idx2) => (
                        <Star 
                          key={idx2} 
                          size={14} 
                          fill={idx2 < review.rating ? "#FFD700" : "none"} 
                          color={idx2 < review.rating ? "#FFD700" : "#cbd5e1"} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="review-comment-text">"{review.comment}"</p>
              </div>
            ))}
          </div>
        </div>

        <div className="feedback-form-container">
          <div className={`flip-card ${submitted ? 'flipped' : ''}`}>
            <div className="flip-card-inner">
              {/* Front Face: The Form */}
              <div 
                className="flip-card-front feedback-form-card"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                <h3>Share Your Experience</h3>
                <p>Your feedback helps us improve our investment services and tools.</p>
                <form onSubmit={handleSubmit} className="f-form">
                  {error && <div className="f-error-alert">{error}</div>}
                  
                  <div className="f-group">
                    <label>Overall Rating</label>
                    <div className="star-rating-selector">
                      {Array(5).fill(0).map((_, idx) => {
                        const starVal = idx + 1;
                        const isSelected = (hoverRating || form.rating) >= starVal;
                        return (
                          <button
                            type="button"
                            key={idx}
                            className={`star-selector-btn ${isSelected ? 'active' : ''}`}
                            onClick={() => {
                              setForm(prev => ({ ...prev, rating: starVal }));
                              setLastClickedStar(starVal);
                              setTimeout(() => setLastClickedStar(null), 600);
                            }}
                            onMouseEnter={() => setHoverRating(starVal)}
                            onMouseLeave={() => setHoverRating(0)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, position: 'relative' }}
                          >
                            <motion.div
                              whileTap={{ scale: 1.5, rotate: [0, -15, 15, 0] }}
                              whileHover={{ scale: 1.25, y: -2 }}
                              transition={{ type: "spring", stiffness: 500, damping: 15 }}
                            >
                              <Star 
                                size={28} 
                                fill={isSelected ? "#FFD700" : "none"} 
                                color={isSelected ? "#FFD700" : "#cbd5e1"} 
                                className="star-icon-transition"
                              />
                            </motion.div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="f-group">
                    <label htmlFor="f-name">Full Name *</label>
                    <input 
                      type="text" 
                      id="f-name" 
                      required 
                      placeholder="e.g. Rahul Sharma" 
                      value={form.name} 
                      onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div className="f-group">
                    <label htmlFor="f-email">Email Address *</label>
                    <input 
                      type="email" 
                      id="f-email" 
                      required 
                      placeholder="e.g. rahul@example.com" 
                      value={form.email} 
                      onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>

                  <div className="f-group">
                    <label htmlFor="f-comment">Your Comments *</label>
                    <textarea 
                      id="f-comment" 
                      required 
                      rows="4" 
                      placeholder="Tell us about your trading experience, our platform, or customer service..." 
                      value={form.comment} 
                      onChange={e => setForm(prev => ({ ...prev, comment: e.target.value }))}
                    ></textarea>
                  </div>

                  <button type="submit" className="btn-primary-lg submit-feedback-btn" style={{ border: 'none', cursor: 'pointer' }} disabled={loading}>
                    {loading ? "Submitting..." : "Submit Review"}
                  </button>
                </form>
              </div>

              {/* Back Face: Cinematic Success */}
              <div className="flip-card-back feedback-success-card">
                <div className="success-content">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={submitted ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -180 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.3 }}
                    className="success-icon-wrapper"
                  >
                    <div className="success-glow-ring" />
                    <CheckCircle size={72} className="success-checkmark-icon" />
                  </motion.div>
                  
                  <motion.h3
                    initial={{ opacity: 0, y: 20 }}
                    animate={submitted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                    transition={{ delay: 0.5 }}
                  >
                    Thank You!
                  </motion.h3>
                  
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={submitted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                    transition={{ delay: 0.6 }}
                    className="success-message-text"
                  >
                    Your review has been successfully submitted.
                  </motion.p>
                  
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={submitted ? { opacity: 1 } : { opacity: 0 }}
                    transition={{ delay: 0.7 }}
                    className="success-note"
                  >
                    (Submissions are reviewed by admin prior to publication)
                  </motion.p>

                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={submitted ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                    transition={{ delay: 0.8 }}
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setMessage(null);
                    }}
                    className="btn-primary-lg reset-feedback-btn"
                  >
                    Submit Another Review
                  </motion.button>
                </div>
                
                {/* Floating cinematic 3D particles */}
                <div className="success-particles">
                  {[...Array(12)].map((_, i) => {
                    const colors = ['#10B981', '#FFD700', '#60A5FA', '#F472B6', '#34D399', '#FCD34D'];
                    const sizes = [6, 8, 10, 5, 7, 9, 6, 8, 5, 10, 7, 6];
                    const color = colors[i % colors.length];
                    const size = sizes[i];
                    return (
                      <motion.div
                        key={i}
                        className="success-particle"
                        animate={{
                          y: [0, -(80 + Math.random() * 120)],
                          x: [0, (i % 3 === 0 ? 40 : i % 3 === 1 ? -40 : 20) * (Math.random() + 0.5)],
                          opacity: [0, 0.9, 0],
                          scale: [0.3, 1.2, 0.3]
                        }}
                        transition={{
                          duration: 2.5 + (i % 3) * 0.8,
                          repeat: Infinity,
                          delay: (i * 0.3) % 2.5,
                          ease: 'easeOut'
                        }}
                        style={{
                          left: `${8 + i * 7}%`,
                          bottom: `${15 + (i % 4) * 10}%`,
                          background: color,
                          color: color,
                          width: `${size}px`,
                          height: `${size}px`,
                          borderRadius: i % 4 === 0 ? '2px' : '50%',
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   9c. REGULATORY / LEGAL FOOTER PAGES
   ═══════════════════════════════════════════════ */
function PrivacyPolicy({ onBackClick }) {
  return (
    <section className="legal-doc-section">
      <div className="container">
        <button onClick={onBackClick} className="btn-back-home" style={{ border: 'none', cursor: 'pointer' }}>
          ← Back to Home
        </button>
        <div className="legal-doc-card">
          <span className="legal-badge">SCSL Compliance</span>
          <h1>Privacy Policy</h1>
          <p className="legal-updated">Last Updated: June 10, 2026</p>
          
          <div className="legal-intro-box">
            <p><strong>Steel City Securities Limited (SCSL)</strong> respects your privacy and is committed to protecting your personal, financial, and KYC data. This Privacy Policy details how we collect, use, store, and safeguard your information when you open demat accounts, register for stock trading services, or use our digital portals.</p>
          </div>

          <div className="legal-section">
            <h2>1. Information We Collect</h2>
            <p>In accordance with SEBI, Prevention of Money Laundering Act (PMLA), and UIDAI guidelines, we collect the following categories of information to facilitate secure trading and depository services:</p>
            <ul>
              <li><strong>Personal Identity details:</strong> Full Name, Date of Birth, Gender, Father's Name, and photographs.</li>
              <li><strong>KYC Verification IDs:</strong> PAN Card details, Aadhaar Card details (securely routed via UIDAI validation), and Address proofs.</li>
              <li><strong>Financial details:</strong> Bank account numbers, IFSC codes, income range, net worth declarations, and tax residency declarations.</li>
              <li><strong>Contact information:</strong> Email addresses, mobile numbers (validated via OTP systems), and mailing addresses.</li>
              <li><strong>Digital Identifiers:</strong> IP addresses, browser specifications, OS types, and device cookies logged during platform authentication.</li>
            </ul>
          </div>

          <div className="legal-section">
            <h2>2. Purpose of Collection</h2>
            <p>Your data is processed strictly for regulatory, transactional, and service-delivery purposes:</p>
            <ul>
              <li>KYC validation and Demat/Trading account opening registration with depositories (NSDL/CDSL).</li>
              <li>Executing equity delivery, intraday, mutual funds, and derivative transactions on exchanges (NSE, BSE, MCX).</li>
              <li>Sending transaction confirmation SMS, contract notes, and verification OTPs.</li>
              <li>Assessing investment profiles for regulatory compliance under capital protection rules.</li>
              <li>Preventing unauthorized activities, digital fraud, and ensuring security audits.</li>
            </ul>
          </div>

          <div className="legal-section">
            <h2>3. Information Sharing and Disclosure</h2>
            <p>SCSL does not sell or lease user data to third-party marketing companies. Data is shared only with certified institutions and intermediaries as required by Indian financial regulations:</p>
            <ul>
              <li><strong>Regulatory Bodies:</strong> SEBI, stock exchanges (NSE, BSE, MCX), and depositories (NSDL, CDSL).</li>
              <li><strong>Government Systems:</strong> Tax authorities, Central KYC Registry (CKYCR), and e-Governance systems.</li>
              <li><strong>Trusted Intermediaries:</strong> Transaction SMS gateways, secure email processors (e.g. Brevo), and payment processors. All intermediaries are legally bound to hold data under absolute confidentiality.</li>
            </ul>
          </div>

          <div className="legal-section">
            <h2>4. Data Security</h2>
            <p>We deploy bank-grade digital security: 256-bit SSL encryption, secure data server isolation, access control policies, audit logging, and regular vulnerability scanning. All database entries are securely stored in protected environments under the jurisdiction of the Republic of India.</p>
          </div>

          <div className="legal-section">
            <h2>5. Contact Compliance Desk</h2>
            <p>For any queries relating to data privacy, demat account security, or grievances, please reach out to our Chief Compliance Officer at <strong>compliance@steelcitynettrade.com</strong>.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Disclaimer({ onBackClick }) {
  return (
    <section className="legal-doc-section">
      <div className="container">
        <button onClick={onBackClick} className="btn-back-home" style={{ border: 'none', cursor: 'pointer' }}>
          ← Back to Home
        </button>
        <div className="legal-doc-card">
          <span className="legal-badge caution">Trading Notice</span>
          <h1>Regulatory Disclaimer</h1>
          <p className="legal-updated">Last Updated: June 10, 2026</p>
          
          <div className="legal-warning-box">
            <p><strong>⚠️ SEBI MANDATORY RISK DISCLOSURE FOR DERIVATIVES (F&O):</strong><br />
            9 out of 10 individual traders in Equity Derivatives (F&O) segment incurred net losses. On average, loss-makers registered net trading losses close to ₹50,000. Over and above the net trading losses incurred, loss-makers expended an additional 15% of net trading losses as transaction costs. Those making net profits, on average, showed transaction costs equal to 15% to 50% of their net profits. Trading in derivatives involves substantial market risk and is not suitable for all investors.</p>
          </div>

          <div className="legal-section">
            <h2>1. General Investment Disclaimer</h2>
            <p>All content, webinars, training materials, charts, and market data displayed on this portal are provided solely for educational and informational purposes. No materials should be construed as direct personal investment advice, buy/sell recommendations, or a guarantee of asset performance.</p>
          </div>

          <div className="legal-section">
            <h2>2. Market Risk Disclosure</h2>
            <p>Investments in the securities market are subject to market risks. Read all the related documents carefully before investing. Stock prices fluctuate based on macroeconomic trends, corporate earnings, interest rate shifts, and global events. Past performance of any strategy, fund, or market index is not an assurance of future returns.</p>
          </div>

          <div className="legal-section">
            <h2>3. Platform Performance</h2>
            <p>While Steel City Securities Limited (SCSL) strives to maintain continuous uptime, lightning-fast order execution, and real-time data feeds through our trading terminals, execution can occasionally be affected by network outages, telecom failures, or system latency. SCSL shall not be held liable for any loss resulting from technical failures beyond our control.</p>
          </div>

          <div className="legal-section">
            <h2>4. No Guaranteed Returns</h2>
            <p>SCSL and its certified market professionals do not guarantee or promise any fixed or recurring returns on demat accounts, trading capital, or mutual fund SIPs. Any representative calculations, projections, or historical returns shown in webinars are illustrative and subject to varying market conditions.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function InvestorCharter({ onBackClick }) {
  return (
    <section className="legal-doc-section">
      <div className="container">
        <button onClick={onBackClick} className="btn-back-home" style={{ border: 'none', cursor: 'pointer' }}>
          ← Back to Home
        </button>
        <div className="legal-doc-card">
          <span className="legal-badge success">SEBI Mandated</span>
          <h1>Investor Charter</h1>
          <p className="legal-updated">SEBI Circular: SEBI/HO/MIRSD/DOP/P/CIR/2021/676</p>
          
          <div className="legal-intro-box">
            <p>This charter is published by <strong>Steel City Securities Limited (Stock Broker & Depository Intermediary)</strong> to inform retail investors of their rights, responsibilities, and the grievance redressal channel mandated by the Securities and Exchange Board of India (SEBI).</p>
          </div>

          <div className="legal-section">
            <h2>1. Rights of Investors</h2>
            <p>Every retail trading and demat account holder has the right to:</p>
            <ul>
              <li><strong>Fair Treatment:</strong> Professional, transparent, and non-discriminatory treatment from our support staff.</li>
              <li><strong>Secure Demat:</strong> Complete control and dematerialization of shares under NSDL/CDSL with real-time SMS notifications for all debits.</li>
              <li><strong>Best Execution:</strong> Trades executed at the best available market prices on the exchanges.</li>
              <li><strong>Prompt Payout:</strong> Payout of funds and delivery of securities within 24 hours of settlement timelines.</li>
              <li><strong>Clear Statements:</strong> Receive digital contract notes, ledger statements, and transaction histories daily/monthly.</li>
            </ul>
          </div>

          <div className="legal-section">
            <h2>2. Responsibilities of Investors</h2>
            <p>To ensure capital protection and secure trading, investors are obligated to:</p>
            <ul>
              <li>Provide accurate, updated KYC details (PAN, Aadhaar, Bank Details, and Active Mobile/Email).</li>
              <li>Sign client agreements and read all risk disclosure documents thoroughly.</li>
              <li>Ensure demat transactions are authorized only using secure OTPs and e-DIS systems.</li>
              <li>Verify ledger balances regularly and report discrepancies within 30 days.</li>
              <li><strong>Never share login credentials, transaction passwords, or trade OTPs with sub-brokers, employees, or third-party advisors.</strong></li>
            </ul>
          </div>

          <div className="legal-section">
            <h2>3. SEBI Mandated Dos and Don'ts</h2>
            <table className="charter-table">
              <thead>
                <tr>
                  <th className="charter-do">✔️ Dos for Investors</th>
                  <th className="charter-dont">❌ Don'ts for Investors</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Always deal with SEBI-registered brokers (check SCSL registration numbers).</td>
                  <td>Never sign blank Delivery Instruction Slips (DIS) or authorization letters.</td>
                </tr>
                <tr>
                  <td>Pay money only via banking channels directly to SCSL's designated client bank accounts.</td>
                  <td>Never make cash transactions with sub-brokers, relationship managers, or agents.</td>
                </tr>
                <tr>
                  <td>Register your active mobile number and email ID to receive direct alerts from SEBI/Exchanges.</td>
                  <td>Never accept guaranteed/assured returns on trading accounts or stock suggestions.</td>
                </tr>
                <tr>
                  <td>Authorize demat debits only via secure CDSL/NSDL verification portals.</td>
                  <td>Never leave your demat account unmonitored for long durations; freeze it if inactive.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="legal-section">
            <h2>4. Grievance Redressal Mechanism</h2>
            <p>If you encounter issues, please follow this escalation path for prompt resolution:</p>
            <ol>
              <li><strong>Escalation Level 1 (Internal):</strong> Submit a ticket to our Grievance Redressal Officer at <strong>grievance@steelcitynettrade.com</strong>. We resolve 95% of queries within 3 working days.</li>
              <li><strong>Escalation Level 2 (SEBI SCORES):</strong> If unresolved within 30 days, register your grievance on SEBI's web-based SCORES portal (scores.gov.in) or call the SEBI helpline: 1800-266-7575.</li>
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   10. CONTACT PAGE
   ═══════════════════════════════════════════════ */
function Contact({ cmsContent = {} }) {
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

  const contactTag = cmsContent.contact_tag || "Get in Touch";
  const contactTitle = cmsContent.contact_title || "Start Your Journey with SCSL Today";
  const contactText = cmsContent.contact_text || "Whether you want to open a trading account, become a franchise partner, or need support — our team is ready.";
  const contactAddress = cmsContent.contact_address || "Steel City Heights, 50-81-18, Seethammapeta Main Road, Visakhapatnam, AP – 530016";
  const contactPhone = cmsContent.contact_phone || "+91 0891-2563581 / 6770222 / 3010969";
  const contactEmail = cmsContent.contact_email || "scsl@steelcitynettrade.com / helpdesk@steelcitynettrade.com";

  return (
    <section className="contact-section">
      <div className="container contact-grid">
        <motion.div className="contact-info" initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
          <span className="section-tag">{contactTag}</span>
          <h2 className="section-title" style={cmsContent.contact_title_size ? { fontSize: cmsContent.contact_title_size } : undefined}>{contactTitle}</h2>
          <p>{contactText}</p>
          <div className="contact-details">
            <div className="cinfo-row"><MapPin size={20} color="#0077B6" /><div><strong>Head Office</strong><br />{contactAddress}</div></div>
            <div className="cinfo-row"><PhoneCall size={20} color="#0077B6" /><div><strong>Helpline</strong><br />{contactPhone}</div></div>
            <div className="cinfo-row"><Mail size={20} color="#0077B6" /><div><strong>Email Support</strong><br />{contactEmail}</div></div>
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
const BLANK_WEBINAR = { id: null, trainer: '', region: '', date: '', day: '', time: '', topic: '', mode: 'Online', seats: 200, link: '', avatar_url: '/host2.png', is_paid: false, fee_amount: 0, payment_utr_required: true, start_time: '' };

function WebinarManageTab({ authHeader, allRegistrations, onRefresh }) {
  const [webinars, setWebinars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(BLANK_WEBINAR);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const formatStartTime = (isoStr) => {
    if (!isoStr) return '';
    const parseStr = (isoStr.includes('+') || isoStr.includes('Z')) ? isoStr : isoStr + '+05:30';
    try {
      return new Date(parseStr).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return isoStr;
    }
  };

  const handleApprovePayment = async (regId) => {
    if (!window.confirm('Approve payment for this registration? This will mark it as paid and automatically send the meeting confirmation email containing the join link.')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/registrations/approve-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({ registration_id: regId })
      });
      if (res.ok) {
        alert('Payment approved successfully! Confirmation email queued.');
        if (onRefresh) onRefresh();
      } else {
        const errData = await res.json();
        alert('Failed to approve payment: ' + (errData.detail || 'Server error'));
      }
    } catch (err) {
      console.error(err);
      alert('Error approving payment.');
    }
  };

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
                        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: '0 0 2px' }}>
                          {w.date} ({w.day}) · {w.time}
                        </p>
                        {w.start_time && (
                          <p style={{ color: '#0f766e', fontSize: '0.82rem', fontWeight: 600, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            ⏰ Starts: {formatStartTime(w.start_time)} (IST)
                          </p>
                        )}
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
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ background: r.payment_status === 'paid' ? '#dcfce7' : '#fee2e2', color: r.payment_status === 'paid' ? '#16a34a' : '#dc2626', padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600, display: 'inline-block' }}>
                                        {r.payment_status === 'paid' ? `✓ ₹${r.fee_paid || w.fee_amount}` : 'Pending'}
                                      </span>
                                      {r.payment_status === 'pending' && (
                                        <button
                                          onClick={() => handleApprovePayment(r.id)}
                                          style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                                          title="Verify payment and send confirmation email"
                                        >
                                          ✓ Approve
                                        </button>
                                      )}
                                    </div>
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
                  <div>
                    <label style={labelStyle}>Exact Start Time (for email reminders) *</label>
                    <input 
                      style={inputStyle} 
                      type="datetime-local" 
                      required 
                      value={formData.start_time ? formData.start_time.slice(0, 16) : ''} 
                      onChange={e => setFormData({...formData, start_time: e.target.value})} 
                    />
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
   11a. ADMIN USERS TAB (Super-Admin Only)
   ═══════════════════════════════════════════════ */
function AdminUsersTab({ authHeader }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', role: 'supervisor' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users`, { headers: { Authorization: authHeader } });
      if (res.ok) setUsers(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const openCreate = () => { setEditUser(null); setForm({ username: '', password: '', role: 'supervisor' }); setShowPassword(false); setShowForm(true); setMsg(''); };
  const openEdit = (u) => { setEditUser(u); setForm({ username: u.username, password: '', role: u.role }); setShowPassword(false); setShowForm(true); setMsg(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      const method = editUser ? 'PUT' : 'POST';
      const body = editUser
        ? { id: editUser.id, username: form.username, password: form.password || undefined, role: form.role }
        : { username: form.username, password: form.password, role: form.role };
      const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
        method, headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) { setMsg('✅ Saved successfully!'); setShowForm(false); fetchUsers(); }
      else setMsg('❌ Error: ' + (data.detail || 'Failed'));
    } catch (e) { setMsg('❌ Network error'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this admin user? This cannot be undone.')) return;
    const res = await fetch(`${API_BASE_URL}/api/admin/users/${id}`, { method: 'DELETE', headers: { Authorization: authHeader } });
    const data = await res.json();
    if (res.ok) fetchUsers();
    else alert('Error: ' + (data.detail || 'Failed to delete'));
  };

  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { fontWeight: 600, fontSize: '0.88rem', color: '#0a1628', display: 'block', marginBottom: '6px' };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ color: 'var(--navy)', margin: 0, fontSize: '1.3rem' }}>👥 Admin User Management</h3>
          <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>Create and manage staff logins. Supervisors cannot access System Settings or Admin Management.</p>
        </div>
        <button onClick={openCreate} className="btn-solid" style={{ border: 'none', cursor: 'pointer', padding: '10px 20px' }}>+ Add Staff</button>
      </div>
      {msg && <div style={{ padding: '10px 14px', borderRadius: '8px', background: msg.startsWith('✅') ? '#f0fdf4' : '#fef2f2', color: msg.startsWith('✅') ? '#16a34a' : '#dc2626', marginBottom: '16px', fontWeight: 600 }}>{msg}</div>}
      {loading ? <div className="admin-loader">Loading...</div> : (
        <table className="admin-table">
          <thead><tr><th>ID</th><th>Username</th><th>Role</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>#{u.id}</td>
                <td className="bold">{u.username}</td>
                <td>
                  <span style={{ padding: '3px 12px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, background: u.role === 'admin' ? 'rgba(99,102,241,0.12)' : 'rgba(16,185,129,0.12)', color: u.role === 'admin' ? '#6366f1' : '#059669' }}>
                    {u.role === 'admin' ? '⭐ Super Admin' : '👤 Supervisor'}
                  </span>
                </td>
                <td>{new Date(u.created_at).toLocaleDateString()}</td>
                <td style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => openEdit(u)} style={{ padding: '6px 14px', borderRadius: '8px', border: '1.5px solid var(--sky)', background: 'transparent', color: 'var(--blue)', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>Edit</button>
                  <button onClick={() => handleDelete(u.id)} className="delete-btn">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '36px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 24px', color: '#0a1628' }}>{editUser ? 'Edit Staff Account' : 'Create Staff Account'}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Username</label>
                <input 
                  style={inputStyle} 
                  required 
                  value={form.username} 
                  onChange={e => setForm({ ...form, username: e.target.value })} 
                  placeholder="Enter username" 
                  autoComplete="new-username"
                />
              </div>
              <div>
                <label style={labelStyle}>{editUser ? 'New Password (leave blank to keep)' : 'Password'}</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input 
                    style={{ ...inputStyle, flex: 1 }} 
                    type={showPassword ? 'text' : 'password'} 
                    required={!editUser} 
                    value={form.password} 
                    onChange={e => setForm({ ...form, password: e.target.value })} 
                    placeholder={editUser ? 'Leave blank to keep current' : 'Enter password'} 
                    autoComplete="new-password"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    style={{ 
                      padding: '10px 14px', 
                      border: '1.5px solid #CBD5E1', 
                      borderRadius: '8px', 
                      background: 'white', 
                      cursor: 'pointer', 
                      fontSize: '0.85rem', 
                      color: '#64748b', 
                      whiteSpace: 'nowrap',
                      height: '42px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {showPassword ? '🙈 Hide' : '👁 Show'}
                  </button>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: 'var(--muted)' }}>
                  🔒 Enter a strong, unique password to prevent browser security warnings.
                </p>
              </div>
              <div>
                <label style={labelStyle}>Role</label>
                <select style={inputStyle} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="supervisor">👤 Supervisor (limited access)</option>
                  <option value="admin">⭐ Super Admin (full access)</option>
                </select>
              </div>
              {msg && <div style={{ color: msg.startsWith('✅') ? '#16a34a' : '#dc2626', fontWeight: 600, fontSize: '0.9rem' }}>{msg}</div>}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 22px', borderRadius: '10px', border: '1.5px solid #CBD5E1', background: 'white', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button type="submit" className="btn-solid" disabled={saving} style={{ border: 'none', cursor: 'pointer', padding: '10px 22px' }}>{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   11b. SYSTEM SETTINGS TAB (Super-Admin Only)
   ═══════════════════════════════════════════════ */
function SystemSettingsTab({ authHeader }) {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState({});
  const [msgs, setMsgs] = useState({});
  const [showPasswords, setShowPasswords] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/settings`, { headers: { Authorization: authHeader } });
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
          const vals = {};
          data.forEach(s => { vals[s.key] = s.value || ''; });
          setValues(vals);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const handleSave = async (key) => {
    setSaving(prev => ({ ...prev, [key]: true }));
    setMsgs(prev => ({ ...prev, [key]: '' }));
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify({ key, value: values[key] })
      });
      const data = await res.json();
      setMsgs(prev => ({ ...prev, [key]: res.ok ? '✅ Saved!' : '❌ ' + (data.detail || 'Error') }));
    } catch (e) { setMsgs(prev => ({ ...prev, [key]: '❌ Network error' })); }
    setSaving(prev => ({ ...prev, [key]: false }));
    setTimeout(() => setMsgs(prev => ({ ...prev, [key]: '' })), 3000);
  };

  const inputStyle = { flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.95rem', outline: 'none', fontFamily: 'monospace' };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ color: 'var(--navy)', margin: '0 0 6px', fontSize: '1.3rem' }}>⚙️ System Settings</h3>
        <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.9rem' }}>Configure email service credentials. These are stored securely in the database and override environment variables.</p>
      </div>
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px', marginBottom: '24px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '1.3rem' }}>💡</span>
        <div style={{ fontSize: '0.88rem', color: '#92400e', lineHeight: '1.5' }}>
          <strong>Priority:</strong> Settings saved here override Render environment variables. Leave a field blank to fall back to Render env vars.<br/>
          <strong>Brevo API Key</strong> is recommended (free tier: 300 emails/day). Alternatively use SMTP with a Gmail app password.
        </div>
      </div>
      {loading ? <div className="admin-loader">Loading settings...</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {settings.map(s => (
            <div key={s.key} style={{ background: '#f8fafc', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0' }}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0a1628', display: 'block' }}>{s.label}</label>
                <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>{s.hint}</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  style={inputStyle}
                  type={s.type === 'password' && !showPasswords[s.key] ? 'password' : 'text'}
                  value={values[s.key] || ''}
                  onChange={e => setValues(prev => ({ ...prev, [s.key]: e.target.value }))}
                  placeholder={`Enter ${s.label.toLowerCase()}...`}
                />
                {s.type === 'password' && (
                  <button type="button" onClick={() => setShowPasswords(prev => ({ ...prev, [s.key]: !prev[s.key] }))} style={{ padding: '10px 14px', border: '1.5px solid #CBD5E1', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '0.85rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {showPasswords[s.key] ? '🙈 Hide' : '👁 Show'}
                  </button>
                )}
                <button onClick={() => handleSave(s.key)} disabled={saving[s.key]} className="btn-solid" style={{ border: 'none', cursor: 'pointer', padding: '10px 20px', whiteSpace: 'nowrap' }}>
                  {saving[s.key] ? 'Saving...' : 'Save'}
                </button>
              </div>
              {msgs[s.key] && <div style={{ marginTop: '8px', fontSize: '0.85rem', fontWeight: 600, color: msgs[s.key].startsWith('✅') ? '#16a34a' : '#dc2626' }}>{msgs[s.key]}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   11c. HOMEPAGE CMS TAB (Admin Sub-Component)
   ═══════════════════════════════════════════════ */
function HomepageCMSTab({ authHeader, cmsContent = {}, onCMSUpdate }) {
  const [subTab, setSubTab] = useState('hero1'); // 'hero1', 'hero2', 'hero3', 'ceo', 'about', 'contact', 'stats', 'why_webinars', 'services'
  const [selectedServiceIndex, setSelectedServiceIndex] = useState(1);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    const initialValues = {};
    const keys = [
      'hero_slide1_badge', 'hero_slide1_title', 'hero_slide1_title_size', 'hero_slide1_subtitle', 'hero_slide1_desc', 'hero_slide1_image',
      'hero_slide2_badge', 'hero_slide2_title', 'hero_slide2_title_size', 'hero_slide2_subtitle', 'hero_slide2_desc', 'hero_slide2_image',
      'hero_slide3_badge', 'hero_slide3_title', 'hero_slide3_title_size', 'hero_slide3_subtitle', 'hero_slide3_desc', 'hero_slide3_image',
      'ceo_name', 'ceo_title', 'ceo_quote', 'ceo_image',
      'about_tag', 'about_title', 'about_title_size', 'about_text_p1', 'about_text_p2', 'about_quote', 'about_quote_cite', 'about_vision', 'about_mission',
      'contact_tag', 'contact_title', 'contact_title_size', 'contact_text', 'contact_address', 'contact_phone', 'contact_email',

      // Trust Stats Bar
      'trust_stat1_num', 'trust_stat1_suffix', 'trust_stat1_lbl',
      'trust_stat2_num', 'trust_stat2_suffix', 'trust_stat2_lbl',
      'trust_stat3_num', 'trust_stat3_suffix', 'trust_stat3_lbl',
      'trust_stat4_num', 'trust_stat4_suffix', 'trust_stat4_lbl',

      // Why Webinars
      'why_webinars_tag', 'why_webinars_title', 'why_webinars_sub',
      'why_card1_title', 'why_card1_p1', 'why_card1_p2', 'why_card1_p3',
      'why_card2_title', 'why_card2_p1', 'why_card2_p2', 'why_card2_p3',
      'why_card3_title', 'why_card3_p1', 'why_card3_p2', 'why_card3_p3',

      // Services Section Header
      'services_tag', 'services_title', 'services_sub',
      
      // Services Card 1
      'svc1_title', 'svc1_desc', 'svc1_f1', 'svc1_f2', 'svc1_f3', 'svc1_f4',
      // Services Card 2
      'svc2_title', 'svc2_desc', 'svc2_f1', 'svc2_f2', 'svc2_f3', 'svc2_f4',
      // Services Card 3
      'svc3_title', 'svc3_desc', 'svc3_f1', 'svc3_f2', 'svc3_f3', 'svc3_f4',
      // Services Card 4
      'svc4_title', 'svc4_desc', 'svc4_f1', 'svc4_f2', 'svc4_f3', 'svc4_f4',
      // Services Card 5
      'svc5_title', 'svc5_desc', 'svc5_f1', 'svc5_f2', 'svc5_f3', 'svc5_f4',
      // Services Card 6
      'svc6_title', 'svc6_desc', 'svc6_f1', 'svc6_f2', 'svc6_f3', 'svc6_f4'
    ];
    keys.forEach(k => {
      initialValues[k] = cmsContent[k] || '';
    });
    setForm(initialValues);
  }, [cmsContent]);

  const handleChange = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
  };

  const handleImageUpload = (e, key) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2.5 * 1024 * 1024) {
      alert("Image size should be less than 2.5MB to ensure fast loading.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      handleChange(key, reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/homepage-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({ content: form })
      });
      const data = await res.json();
      if (res.ok) {
        setSaveMsg('✅ Homepage content updated successfully!');
        if (onCMSUpdate) await onCMSUpdate();
      } else {
        setSaveMsg('❌ Error: ' + (data.detail || 'Failed to save changes'));
      }
    } catch (err) {
      console.error(err);
      setSaveMsg('❌ Network error saving CMS data.');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 4000);
    }
  };

  const renderInputField = (key, label, placeholder = '') => (
    <div className="cms-form-group">
      <label>{label}</label>
      <input
        type="text"
        placeholder={placeholder}
        value={form[key] || ''}
        onChange={e => handleChange(key, e.target.value)}
      />
    </div>
  );

  const renderTextareaField = (key, label, rows = 3, placeholder = '') => (
    <div className="cms-form-group">
      <label>{label}</label>
      <textarea
        rows={rows}
        placeholder={placeholder}
        value={form[key] || ''}
        onChange={e => handleChange(key, e.target.value)}
      />
    </div>
  );

  const renderImageField = (key, label, defaultFallback) => {
    const currentSrc = form[key] || defaultFallback;
    return (
      <div className="cms-form-group">
        <label>{label}</label>
        <div className="cms-image-upload-wrap">
          <img src={currentSrc} alt="Preview" className="cms-image-preview" />
          <div className="cms-image-upload-btn-wrap">
            <label htmlFor={`file-${key}`} className="cms-image-upload-label">
              Choose Image File
            </label>
            <input
              id={`file-${key}`}
              type="file"
              accept="image/*"
              className="cms-image-upload-input"
              onChange={e => handleImageUpload(e, key)}
            />
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Base64 format. Max 2.5MB.
            </span>
          </div>
        </div>
      </div>
    );
  };

  const cmsNavItems = [
    { key: 'hero1',        label: '🔥 Hero Slide 1' },
    { key: 'hero2',        label: '📢 Hero Slide 2' },
    { key: 'hero3',        label: '🏆 Hero Slide 3' },
    { key: 'stats',        label: '📊 Trust Stats' },
    { key: 'why_webinars', label: '💡 Why Webinars' },
    { key: 'services',     label: '🛠 Services' },
    { key: 'ceo',          label: '💼 CEO Details' },
    { key: 'about',        label: '📖 About Section' },
    { key: 'contact',      label: '📞 Contact Details' },
  ];

  return (
    <div className="cms-editor-container">
      {/* ── Desktop Sidebar ── */}
      <div className="cms-sidebar">
        <h4 style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Homepage Sections</h4>
        {cmsNavItems.map(item => (
          <button key={item.key} className={`cms-sidebar-btn ${subTab === item.key ? 'active' : ''}`} onClick={() => setSubTab(item.key)}>
            {item.label}
          </button>
        ))}
      </div>

      {/* ── Mobile Dropdown Selector (hidden on desktop) ── */}
      <div className="cms-mobile-select-wrap">
        <label className="cms-mobile-select-label">📋 Select Section to Edit</label>
        <select
          className="cms-mobile-select"
          value={subTab}
          onChange={e => setSubTab(e.target.value)}
        >
          {cmsNavItems.map(item => (
            <option key={item.key} value={item.key}>{item.label}</option>
          ))}
        </select>
      </div>

      <div className="cms-content-area">
        {subTab === 'hero1' && (
          <div className="cms-form-section">
            <h3 style={{ margin: '0 0 10px 0', color: 'var(--navy)' }}>Hero Slide 1 Configuration</h3>
            {renderInputField('hero_slide1_badge', 'Badge Text', 'e.g. 🎓 Absolutely Free Online Training')}
            {renderTextareaField('hero_slide1_title', 'Main Title', 2, 'e.g. FREE STOCK MARKET TRAINING PROGRAM')}
            {renderInputField('hero_slide1_title_size', 'Title Font Size (CSS format)', 'e.g. 2.8rem or 42px (leave blank for default)')}
            {renderInputField('hero_slide1_subtitle', 'Sub-heading', 'Exclusively For New Investors...')}
            {renderTextareaField('hero_slide1_desc', 'Description Paragraph', 3)}
            {renderImageField('hero_slide1_image', 'Slide Image', '/slide1.png')}
          </div>
        )}

        {subTab === 'hero2' && (
          <div className="cms-form-section">
            <h3 style={{ margin: '0 0 10px 0', color: 'var(--navy)' }}>Hero Slide 2 Configuration</h3>
            {renderInputField('hero_slide2_badge', 'Badge Text', 'e.g. 💻 Interactive Live Webinars')}
            {renderTextareaField('hero_slide2_title', 'Main Title', 2)}
            {renderInputField('hero_slide2_title_size', 'Title Font Size (CSS format)', 'e.g. 2.8rem (leave blank for default)')}
            {renderInputField('hero_slide2_subtitle', 'Sub-heading')}
            {renderTextareaField('hero_slide2_desc', 'Description Paragraph', 3)}
            {renderImageField('hero_slide2_image', 'Slide Image', '/slide2.png')}
          </div>
        )}

        {subTab === 'hero3' && (
          <div className="cms-form-section">
            <h3 style={{ margin: '0 0 10px 0', color: 'var(--navy)' }}>Hero Slide 3 Configuration</h3>
            {renderInputField('hero_slide3_badge', 'Badge Text', 'e.g. 🏆 Expert Research Advisors')}
            {renderTextareaField('hero_slide3_title', 'Main Title', 2)}
            {renderInputField('hero_slide3_title_size', 'Title Font Size (CSS format)', 'e.g. 2.8rem (leave blank for default)')}
            {renderInputField('hero_slide3_subtitle', 'Sub-heading')}
            {renderTextareaField('hero_slide3_desc', 'Description Paragraph', 3)}
            {renderImageField('hero_slide3_image', 'Slide Image', '/slide3.png')}
          </div>
        )}

        {subTab === 'stats' && (
          <div className="cms-form-section">
            <h3 style={{ margin: '0 0 10px 0', color: 'var(--navy)' }}>📊 Trust Statistics Counter</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 12px 0' }}>Stat 1 (e.g. Years of Trust)</h4>
                {renderInputField('trust_stat1_num', 'Number Value', 'e.g. 31')}
                {renderInputField('trust_stat1_suffix', 'Suffix Symbol', 'e.g. +')}
                {renderInputField('trust_stat1_lbl', 'Text Label', 'e.g. Years of Trust')}
              </div>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 12px 0' }}>Stat 2 (e.g. Investors Served)</h4>
                {renderInputField('trust_stat2_num', 'Number Value', 'e.g. 400000')}
                {renderInputField('trust_stat2_suffix', 'Suffix Symbol', 'e.g. +')}
                {renderInputField('trust_stat2_lbl', 'Text Label', 'e.g. Investors Served')}
              </div>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 12px 0' }}>Stat 3 (e.g. Pan India Locations)</h4>
                {renderInputField('trust_stat3_num', 'Number Value', 'e.g. 420')}
                {renderInputField('trust_stat3_suffix', 'Suffix Symbol', 'e.g. +')}
                {renderInputField('trust_stat3_lbl', 'Text Label', 'e.g. Pan India Locations')}
              </div>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 12px 0' }}>Stat 4 (e.g. States e-Gov)</h4>
                {renderInputField('trust_stat4_num', 'Number Value', 'e.g. 22')}
                {renderInputField('trust_stat4_suffix', 'Suffix Symbol', 'e.g. (blank)')}
                {renderInputField('trust_stat4_lbl', 'Text Label', 'e.g. States (e-Gov)')}
              </div>
            </div>
          </div>
        )}

        {subTab === 'why_webinars' && (
          <div className="cms-form-section">
            <h3 style={{ margin: '0 0 10px 0', color: 'var(--navy)' }}>💡 "Why Choose SCSL Webinars?" Details</h3>
            {renderInputField('why_webinars_tag', 'Section Tagline', 'Investor Empowerment')}
            {renderInputField('why_webinars_title', 'Section Heading', 'Why Choose SCSL Webinars?')}
            {renderTextareaField('why_webinars_sub', 'Section Subheading', 2, 'Transform your understanding...')}
            
            <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
            
            <h4 style={{ margin: '0 0 12px 0', color: 'var(--navy)' }}>Card 1 (Why Watch SCSL Webinars?)</h4>
            {renderInputField('why_card1_title', 'Card Title', 'Why Watch SCSL Webinars?')}
            {renderInputField('why_card1_p1', 'Point 1')}
            {renderInputField('why_card1_p2', 'Point 2')}
            {renderInputField('why_card1_p3', 'Point 3')}

            <h4 style={{ margin: '20px 0 12px 0', color: 'var(--navy)' }}>Card 2 (Why Register in Advance?)</h4>
            {renderInputField('why_card2_title', 'Card Title', 'Why Register in Advance?')}
            {renderInputField('why_card2_p1', 'Point 1')}
            {renderInputField('why_card2_p2', 'Point 2')}
            {renderInputField('why_card2_p3', 'Point 3')}

            <h4 style={{ margin: '20px 0 12px 0', color: 'var(--navy)' }}>Card 3 (What is the Practical Use?)</h4>
            {renderInputField('why_card3_title', 'Card Title', 'What is the Practical Use?')}
            {renderInputField('why_card3_p1', 'Point 1')}
            {renderInputField('why_card3_p2', 'Point 2')}
            {renderInputField('why_card3_p3', 'Point 3')}
          </div>
        )}

        {subTab === 'services' && (
          <div className="cms-form-section">
            <h3 style={{ margin: '0 0 10px 0', color: 'var(--navy)' }}>🛠 Services Card Configuration</h3>
            {renderInputField('services_tag', 'Section Tagline', 'Our Expertise')}
            {renderInputField('services_title', 'Section Main Heading', 'Comprehensive Financial Solutions')}
            {renderTextareaField('services_sub', 'Section Description Subtext', 2, 'One platform. Every financial need...')}

            <div style={{ margin: '20px 0', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>Select Service Card to Edit:</span>
              <select 
                value={selectedServiceIndex} 
                onChange={e => setSelectedServiceIndex(parseInt(e.target.value))} 
                style={{ padding: '8px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', outline: 'none', background: 'white', fontWeight: 600 }}
              >
                <option value={1}>Card 1 (Stock Broking)</option>
                <option value={2}>Card 2 (Depository Services)</option>
                <option value={3}>Card 3 (e-Governance)</option>
                <option value={4}>Card 4 (Life Insurance)</option>
                <option value={5}>Card 5 (NBFC Loan Services)</option>
                <option value={6}>Card 6 (Investments)</option>
              </select>
            </div>

            <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h4 style={{ margin: 0, color: 'var(--navy)' }}>Service Card #{selectedServiceIndex} Details</h4>
              {renderInputField(`svc${selectedServiceIndex}_title`, 'Card Title')}
              {renderTextareaField(`svc${selectedServiceIndex}_desc`, 'Card Description', 3)}
              {renderInputField(`svc${selectedServiceIndex}_f1`, 'Bullet Point 1')}
              {renderInputField(`svc${selectedServiceIndex}_f2`, 'Bullet Point 2')}
              {renderInputField(`svc${selectedServiceIndex}_f3`, 'Bullet Point 3')}
              {renderInputField(`svc${selectedServiceIndex}_f4`, 'Bullet Point 4')}
            </div>
          </div>
        )}

        {subTab === 'ceo' && (
          <div className="cms-form-section">
            <h3 style={{ margin: '0 0 10px 0', color: 'var(--navy)' }}>Managing Director & CEO Details</h3>
            {renderInputField('ceo_name', 'CEO Full Name', 'Satish Kumar Arya')}
            {renderInputField('ceo_title', 'CEO Title / Position', 'Managing Director & CEO')}
            {renderTextareaField('ceo_quote', 'CEO Quote / Message', 3, '"Building wealth, building trust..."')}
            {renderImageField('ceo_image', 'CEO Card Photo', '/ceo.png')}
          </div>
        )}

        {subTab === 'about' && (
          <div className="cms-form-section">
            <h3 style={{ margin: '0 0 10px 0', color: 'var(--navy)' }}>About Us Section Configuration</h3>
            {renderInputField('about_tag', 'Section Tagline', 'Our Story')}
            {renderInputField('about_title', 'Section Main Heading', 'Three Decades of Trusted Financial Leadership')}
            {renderInputField('about_title_size', 'Heading Font Size', 'e.g. 2.5rem')}
            {renderTextareaField('about_text_p1', 'First Paragraph', 4)}
            {renderTextareaField('about_text_p2', 'Second Paragraph', 4)}
            {renderTextareaField('about_quote', 'Highlighted Quote box', 3)}
            {renderInputField('about_quote_cite', 'Quote citation author', '- SCSL Corporate Philosophy')}
            {renderTextareaField('about_vision', 'Our Vision Paragraph', 3)}
            {renderTextareaField('about_mission', 'Our Mission Paragraph', 3)}
          </div>
        )}

        {subTab === 'contact' && (
          <div className="cms-form-section">
            <h3 style={{ margin: '0 0 10px 0', color: 'var(--navy)' }}>Contact Details & Location</h3>
            {renderInputField('contact_tag', 'Section Tagline', 'Get in Touch')}
            {renderInputField('contact_title', 'Section Heading', 'Start Your Journey with SCSL Today')}
            {renderInputField('contact_title_size', 'Heading Font Size', 'e.g. 2.5rem')}
            {renderTextareaField('contact_text', 'Section Paragraph Text', 3)}
            {renderTextareaField('contact_address', 'Corporate Head Office Address', 3)}
            {renderInputField('contact_phone', 'Helpline Numbers (slash separated)', '+91 0891-2563581 / 6770222')}
            {renderInputField('contact_email', 'Support Email Addresses (slash separated)', 'scsl@steelcitynettrade.com')}
          </div>
        )}

        <div className="cms-save-bar">
          {saveMsg && (
            <span style={{ fontWeight: 600, marginRight: '10px', color: saveMsg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>
              {saveMsg}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-solid"
            style={{ border: 'none', cursor: 'pointer', padding: '12px 28px', fontSize: '0.95rem' }}
          >
            {saving ? 'Saving changes...' : '💾 Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   10b. CLIENT CRM LOGIN & DASHBOARD PAGE
   ═══════════════════════════════════════════════ */
function CRMClientPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clientData, setClientData] = useState(null);
  const [activeTab, setActiveTab] = useState('portfolio');
  const [authHeader, setAuthHeader] = useState(() => localStorage.getItem('scsl_crm_auth') || null);

  const fetchDashboard = async (auth) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/crm/client/dashboard`, {
        headers: { 'Authorization': auth }
      });
      if (res.status === 401) {
        localStorage.removeItem('scsl_crm_auth');
        setAuthHeader(null);
        setError('Session expired or invalid credentials.');
      } else if (!res.ok) {
        throw new Error('Failed to fetch CRM data.');
      } else {
        const data = await res.json();
        setClientData(data);
      }
    } catch (err) {
      console.error(err);
      setError('Could not connect to backend server. Make sure the server is online.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authHeader) {
      fetchDashboard(authHeader);
    }
  }, [authHeader]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/crm/client/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        const auth = 'Basic ' + btoa(username + ':' + password);
        localStorage.setItem('scsl_crm_auth', auth);
        setAuthHeader(auth);
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Invalid username or password.');
      }
    } catch (err) {
      console.error(err);
      setError('Could not connect to backend server.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('scsl_crm_auth');
    setAuthHeader(null);
    setClientData(null);
    setUsername('');
    setPassword('');
    setError('');
  };

  if (!authHeader || !clientData) {
    return (
      <section className="crm-login-container">
        <motion.div 
          className="crm-login-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div style={{ textAlign: 'center', marginBottom: '25px' }}>
            <img src="https://www.steelcitynettrade.com/images/Steelcity-logo.png" alt="SCSL Logo" style={{ height: '40px', marginBottom: '15px' }} />
            <h2 style={{ color: 'var(--navy)', fontWeight: 800, fontSize: '1.5rem', margin: '0 0 6px 0' }}>Client CRM Access</h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: 0 }}>View your mutual fund portfolio and advisor advisory logs</p>
          </div>

          {error && (
            <div style={{ background: '#FEE2E2', color: 'var(--red)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '18px', fontWeight: 500 }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="crm-form-group">
              <label>CRM Username</label>
              <input 
                type="text" 
                className="crm-form-control" 
                placeholder="Enter CRM username" 
                required 
                value={username} 
                onChange={e => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="crm-form-group">
              <label>CRM Password</label>
              <input 
                type="password" 
                className="crm-form-control" 
                placeholder="Enter CRM password" 
                required 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <button 
              type="submit" 
              className="crm-btn-primary" 
              style={{ width: '100%', padding: '12px', fontSize: '0.95rem', marginTop: '10px' }}
              disabled={loading}
            >
              {loading ? 'Verifying Account...' : 'Access CRM Dashboard'}
            </button>
          </form>
        </motion.div>
      </section>
    );
  }

  const { client, holdings, tasks } = clientData;
  const totalValuation = holdings.reduce((sum, h) => sum + h.current_value, 0);
  const totalInvested = holdings.reduce((sum, h) => sum + (h.units * h.purchase_price), 0);
  const netGain = totalValuation - totalInvested;
  const gainPercent = totalInvested > 0 ? (netGain / totalInvested) * 100 : 0;

  return (
    <section className="crm-dashboard-container">
      <div className="container">
        
        {/* Welcome Banner */}
        <div className="crm-welcome-banner">
          <div>
            <h1 className="crm-welcome-title">Good Morning, {client.name}</h1>
            <p className="crm-welcome-subtitle">Welcome back to your Steel City CRM workspace. Here is your portfolio summary.</p>
          </div>
          <button className="crm-btn-primary" onClick={handleLogout} style={{ background: 'transparent', border: '1.5px solid rgba(255,255,255,0.3)' }}>Log Out</button>
        </div>

        {/* Core Stats */}
        <div className="crm-grid-3">
          <div className="crm-card">
            <h3 className="crm-card-title">Portfolio Valuation (AUM)</h3>
            <div className="crm-card-val">₹{totalValuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            <p className="crm-card-sub">Updated dynamically | NAV Date: Today</p>
          </div>
          <div className="crm-card">
            <h3 className="crm-card-title">Net Gains / Returns</h3>
            <div className="crm-card-val" style={{ color: netGain >= 0 ? 'var(--emerald)' : 'var(--rose)' }}>
              {netGain >= 0 ? '+' : ''}₹{netGain.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <p className="crm-card-sub" style={{ color: netGain >= 0 ? 'var(--emerald)' : 'var(--rose)', fontWeight: 700 }}>
              {netGain >= 0 ? '▲' : '▼'} {gainPercent.toFixed(2)}% absolute returns
            </p>
          </div>
          <div className="crm-card">
            <h3 className="crm-card-title">My Adviser Profile</h3>
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--navy)' }}>RM Name: {client.rm_name}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '4px' }}>Status: <span style={{ color: 'var(--emerald)', fontWeight: 700 }}>● Active Investor</span></div>
            </div>
          </div>
        </div>

        {/* Tabs Manager */}
        <div className="crm-tabs-container">
          <div className="crm-tabs-header">
            <button className={`crm-tab-btn ${activeTab === 'portfolio' ? 'active' : ''}`} onClick={() => setActiveTab('portfolio')}>
              💼 My Asset Holdings
            </button>
            <button className={`crm-tab-btn ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>
              🔔 Advisory & Interactions
            </button>
            <button className={`crm-tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
              👤 My Account Details
            </button>
          </div>

          <div className="crm-tab-content">
            {activeTab === 'portfolio' && (
              <div>
                <h3 className="crm-section-title">Mutual Fund & Equity Holdings</h3>
                {holdings.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: 'var(--muted)' }}>No holdings recorded. Please contact your Relationship Manager to upload transaction data.</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="crm-table">
                      <thead>
                        <tr>
                          <th>Scheme / Stock Name</th>
                          <th>Folio No</th>
                          <th>Asset Class</th>
                          <th>Units Held</th>
                          <th>Buy NAV</th>
                          <th>Current NAV</th>
                          <th>Invested Val</th>
                          <th>Current Val</th>
                          <th>Gain/Loss</th>
                        </tr>
                      </thead>
                      <tbody>
                        {holdings.map(h => {
                          const cost = h.units * h.purchase_price;
                          const gain = h.current_value - cost;
                          return (
                            <tr key={h.id}>
                              <td style={{ fontWeight: 700, color: 'var(--navy)' }}>{h.scheme_name}</td>
                              <td>{h.folio_number}</td>
                              <td><span style={{ fontSize: '0.8rem', background: '#e2e8f0', padding: '3px 8px', borderRadius: '12px', fontWeight: 600 }}>{h.asset_class}</span></td>
                              <td>{h.units.toFixed(3)}</td>
                              <td>₹{h.purchase_price.toFixed(2)}</td>
                              <td>₹{h.current_nav.toFixed(2)}</td>
                              <td>₹{cost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                              <td style={{ fontWeight: 800 }}>₹{h.current_value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                              <td style={{ fontWeight: 700, color: gain >= 0 ? 'var(--emerald)' : 'var(--rose)' }}>
                                {gain >= 0 ? '+' : ''}{((gain / cost) * 100).toFixed(1)}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'tasks' && (
              <div>
                <h3 className="crm-section-title">Advisor Call Logs & Advisory Actions</h3>
                {tasks.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: 'var(--muted)' }}>No follow-up calls or tasks scheduled.</div>
                ) : (
                  <div className="crm-timeline">
                    {tasks.map(t => (
                      <div className="crm-timeline-item" key={t.id}>
                        <div className={`crm-timeline-badge ${t.type.toLowerCase()}`}>
                          {t.type === 'Call' && <PhoneCall size={16} />}
                          {t.type === 'Meeting' && <Users size={16} />}
                          {t.type === 'Email' && <Mail size={16} />}
                          {t.type === 'Task' && <Briefcase size={16} />}
                        </div>
                        <div className="crm-timeline-content">
                          <div className="crm-timeline-title">
                            <span>{t.title}</span>
                            <span style={{ 
                              fontSize: '0.78rem', 
                              padding: '2px 8px', 
                              borderRadius: '12px', 
                              background: t.status === 'Completed' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                              color: t.status === 'Completed' ? '#059669' : '#d97706',
                              fontWeight: 700
                            }}>{t.status}</span>
                          </div>
                          <p className="crm-timeline-desc">{t.description}</p>
                          <div className="crm-timeline-meta">
                            <span>Due Date: {t.due_date ? new Date(t.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Flexible'}</span>
                            <span>●</span>
                            <span>Type: {t.type}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'profile' && (
              <div>
                <h3 className="crm-section-title">Personal CRM Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px' }}>
                  <div className="crm-card" style={{ boxShadow: 'none', border: '1px solid #f1f5f9' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: 'var(--navy)' }}>Contact Details</h4>
                    <p style={{ margin: '6px 0', fontSize: '0.9rem' }}><strong>Email:</strong> {client.email}</p>
                    <p style={{ margin: '6px 0', fontSize: '0.9rem' }}><strong>Phone:</strong> {client.phone}</p>
                    <p style={{ margin: '6px 0', fontSize: '0.9rem' }}><strong>Address:</strong> {client.address || 'N/A'}</p>
                  </div>
                  <div className="crm-card" style={{ boxShadow: 'none', border: '1px solid #f1f5f9' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: 'var(--navy)' }}>Tax & Registry</h4>
                    <p style={{ margin: '6px 0', fontSize: '0.9rem' }}><strong>PAN Card:</strong> {client.pan || 'N/A'}</p>
                    <p style={{ margin: '6px 0', fontSize: '0.9rem' }}><strong>Date of Birth:</strong> {client.dob || 'N/A'}</p>
                    <p style={{ margin: '6px 0', fontSize: '0.9rem' }}><strong>Account Status:</strong> <span style={{ color: 'var(--emerald)', fontWeight: 700 }}>{client.status}</span></p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   10c. ADMIN CRM SUITE COMPONENT
   ═══════════════════════════════════════════════ */
function AdminCRMTab({ authHeader }) {
  const [crmSubTab, setCrmSubTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [clients, setClients] = useState([]);
  const [leads, setLeads] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientDetails, setClientDetails] = useState({ holdings: [], tasks: [] });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  // Client Create/Edit
  const [cName, setCName] = useState('');
  const [cUsername, setCUsername] = useState('');
  const [cPassword, setCPassword] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cPan, setCPan] = useState('');
  const [cDob, setCDob] = useState('');
  const [cAddress, setCAddress] = useState('');
  const [cRm, setCRm] = useState('mukeshrm');
  const [cStatus, setCStatus] = useState('Active');
  const [showPassword, setShowPassword] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  
  // Holdings
  const [hScheme, setHScheme] = useState('');
  const [hFolio, setHFolio] = useState('');
  const [hUnits, setHUnits] = useState('');
  const [hPrice, setHPrice] = useState('');
  const [hNav, setHNav] = useState('');
  const [hAsset, setHAsset] = useState('Equity');

  // Tasks
  const [tTitle, setTTitle] = useState('');
  const [tDesc, setTDesc] = useState('');
  const [tType, setTType] = useState('Call');
  const [tDue, setTDue] = useState('');

  // Leads
  const [lName, setLName] = useState('');
  const [lEmail, setLEmail] = useState('');
  const [lPhone, setLPhone] = useState('');
  const [lSource, setLSource] = useState('Website');
  const [lStatus, setLStatus] = useState('Contacted');
  const [lRemarks, setLRemarks] = useState('');

  const fetchDashboardData = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/crm/dashboard`, {
        headers: { 'Authorization': authHeader }
      });
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (err) { console.error(err); }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/crm/clients`, {
        headers: { 'Authorization': authHeader }
      });
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (err) { console.error(err); }
  };

  const fetchLeads = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/crm/leads`, {
        headers: { 'Authorization': authHeader }
      });
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (err) { console.error(err); }
  };

  const fetchClientDetails = async (username) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/crm/clients/${username}/details`, {
        headers: { 'Authorization': authHeader }
      });
      if (res.ok) {
        const data = await res.json();
        setClientDetails(data);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchClients();
    fetchLeads();
  }, []);

  const handleSelectClient = (c) => {
    setSelectedClient(c);
    if (c) {
      fetchClientDetails(c.username);
      // Pre-fill edit client inputs
      setCName(c.name);
      setCUsername(c.username);
      setCPassword(c.password_raw);
      setCEmail(c.email);
      setCPhone(c.phone);
      setCPan(c.pan || '');
      setCDob(c.dob || '');
      setCAddress(c.address || '');
      setCRm(c.rm_name || 'mukeshrm');
      setCStatus(c.status || 'Active');
    }
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    setUsernameError('');

    // Uniqueness check: username must not exist in another client
    const isDuplicate = clients.some(c =>
      c.username.toLowerCase() === cUsername.toLowerCase() &&
      (!selectedClient || c.username.toLowerCase() !== selectedClient.username.toLowerCase())
    );
    if (isDuplicate) {
      setUsernameError('This username is already taken. Please choose a different one.');
      return;
    }

    try {
      const method = selectedClient ? 'PUT' : 'POST';
      const url = selectedClient
        ? `${API_BASE_URL}/api/admin/crm/clients/${selectedClient.id}`
        : `${API_BASE_URL}/api/admin/crm/clients`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({
          name: cName, username: cUsername, password_raw: cPassword,
          email: cEmail, phone: cPhone, pan: cPan, dob: cDob,
          address: cAddress, rm_name: cRm, status: cStatus
        })
      });
      if (res.ok) {
        alert(selectedClient ? 'Client profile updated successfully!' : 'Client created successfully!');
        fetchClients();
        setSelectedClient(null);
        setUsernameError('');
        // Reset inputs
        setCName(''); setCUsername(''); setCPassword(''); setCEmail(''); setCPhone('');
        setCPan(''); setCDob(''); setCAddress(''); setCRm('mukeshrm'); setCStatus('Active');
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.detail || 'Failed to save client details.');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to database.');
    }
  };

  const handleDeleteClient = async (id) => {
    if (!window.confirm('Delete this client profile? All portfolio and task logs will be lost permanently.')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/crm/clients/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': authHeader }
      });
      if (res.ok) {
        alert('Client profile deleted.');
        setSelectedClient(null);
        fetchClients();
      }
    } catch (err) { console.error(err); }
  };

  const handleAddHolding = async (e) => {
    e.preventDefault();
    if (!selectedClient) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/crm/clients/${selectedClient.username}/holdings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({
          scheme_name: hScheme,
          folio_number: hFolio,
          units: parseFloat(hUnits),
          purchase_price: parseFloat(hPrice),
          current_nav: parseFloat(hNav),
          asset_class: hAsset
        })
      });
      if (res.ok) {
        alert('Asset holding added successfully.');
        fetchClientDetails(selectedClient.username);
        fetchClients(); // refresh overall AUM in list
        // Reset holding form
        setHScheme(''); setHFolio(''); setHUnits(''); setHPrice(''); setHNav('');
      } else {
        alert('Failed to add holding record.');
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteHolding = async (id) => {
    if (!window.confirm('Delete this holding record?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/crm/clients/holdings/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': authHeader }
      });
      if (res.ok) {
        fetchClientDetails(selectedClient.username);
        fetchClients();
      }
    } catch (err) { console.error(err); }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!selectedClient) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/crm/clients/${selectedClient.username}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({
          title: tTitle,
          description: tDesc,
          type: tType,
          status: 'Pending',
          due_date: tDue ? new Date(tDue).toISOString() : null
        })
      });
      if (res.ok) {
        alert('Interaction / task scheduled.');
        fetchClientDetails(selectedClient.username);
        fetchDashboardData();
        setTTitle(''); setTDesc(''); setTType('Call'); setTDue('');
      }
    } catch (err) { console.error(err); }
  };

  const handleToggleTask = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/crm/tasks/${id}/toggle`, {
        method: 'POST',
        headers: { 'Authorization': authHeader }
      });
      if (res.ok) {
        fetchClientDetails(selectedClient.username);
        fetchDashboardData();
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/crm/tasks/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': authHeader }
      });
      if (res.ok) {
        fetchClientDetails(selectedClient.username);
        fetchDashboardData();
      }
    } catch (err) { console.error(err); }
  };

  const handleSaveLead = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/crm/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({
          name: lName, email: lEmail, phone: lPhone,
          source: lSource, status: lStatus, remarks: lRemarks
        })
      });
      if (res.ok) {
        alert('Lead registered.');
        fetchLeads();
        fetchDashboardData();
        setLName(''); setLEmail(''); setLPhone(''); setLRemarks('');
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteLead = async (id) => {
    if (!window.confirm('Delete this lead?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/crm/leads/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': authHeader }
      });
      if (res.ok) {
        fetchLeads();
        fetchDashboardData();
      }
    } catch (err) { console.error(err); }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  return (
    <div className="admin-crm-workspace">
      
      {/* Sidebar navigation */}
      <div className="admin-crm-sidebar">
        <div className="admin-crm-sidebar-header">
          <div className="admin-crm-sidebar-title">Adviser CRM Console</div>
        </div>
        <button className={`admin-crm-nav-btn ${crmSubTab === 'dashboard' ? 'active' : ''}`} onClick={() => setCrmSubTab('dashboard')}>
          📊 CRM Dashboard
        </button>
        <button className={`admin-crm-nav-btn ${crmSubTab === 'leads' ? 'active' : ''}`} onClick={() => setCrmSubTab('leads')}>
          👤 Leads Manager
        </button>
        <button className={`admin-crm-nav-btn ${crmSubTab === 'clients' ? 'active' : ''}`} onClick={() => { setCrmSubTab('clients'); handleSelectClient(null); }}>
          👥 Clients &amp; Portfolios
        </button>
      </div>

      {/* Main Workspace content */}
      <div className="admin-crm-content">
        
        {crmSubTab === 'dashboard' && dashboardData && (
          <div>
            <h2 className="crm-section-title" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>CRM Business Analytics</h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: '0 0 25px 0' }}>Overall advisory overview, total client valuations, and follow-up activities.</p>

            <div className="crm-grid-3">
              <div className="crm-card" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
                <h3 className="crm-card-title">Total Managed AUM</h3>
                <div className="crm-card-val" style={{ color: 'var(--blue)' }}>₹{dashboardData.total_aum.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                <p className="crm-card-sub" style={{ color: '#2563eb', fontWeight: 600 }}>Total asset valuation under advice</p>
              </div>
              <div className="crm-card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0' }}>
                <h3 className="crm-card-title">Advisory Clients</h3>
                <div className="crm-card-val" style={{ color: '#059669' }}>{dashboardData.total_clients}</div>
                <p className="crm-card-sub" style={{ color: '#059669', fontWeight: 600 }}>Registered portal client accounts</p>
              </div>
              <div className="crm-card" style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
                <h3 className="crm-card-title">Open Activities</h3>
                <div className="crm-card-val" style={{ color: '#d97706' }}>{dashboardData.tasks.total_unresolved}</div>
                <p className="crm-card-sub" style={{ color: '#d97706', fontWeight: 600 }}>Pending follow-up actions</p>
              </div>
            </div>

            <div className="crm-dashboard-row">
              
              {/* TASKS BREAKDOWN (Donut Representation) */}
              <div className="crm-widget-card">
                <div className="crm-widget-header">
                  <h3 className="crm-widget-title">Tasks Overview</h3>
                  <span style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>Unresolved</span>
                </div>
                <div className="crm-sub-grid-3" style={{ marginBottom: '15px' }}>
                  <div className="crm-mini-stat">
                    <div className="crm-mini-stat-label" style={{ color: 'var(--rose)' }}>Overdue</div>
                    <div className="crm-mini-stat-val" style={{ color: 'var(--rose)' }}>{dashboardData.tasks.overdue}</div>
                  </div>
                  <div className="crm-mini-stat">
                    <div className="crm-mini-stat-label" style={{ color: 'var(--amber)' }}>Due Today</div>
                    <div className="crm-mini-stat-val" style={{ color: 'var(--amber)' }}>{dashboardData.tasks.due_today}</div>
                  </div>
                  <div className="crm-mini-stat">
                    <div className="crm-mini-stat-label" style={{ color: 'var(--blue)' }}>Upcoming</div>
                    <div className="crm-mini-stat-val" style={{ color: 'var(--blue)' }}>{dashboardData.tasks.upcoming}</div>
                  </div>
                </div>

                <div className="crm-chart-container">
                  <div className="crm-donut-wrapper">
                    <svg viewBox="0 0 36 36" className="crm-chart-svg" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3b82f6" strokeWidth="3" 
                        strokeDasharray={`${(dashboardData.tasks.breakup.Call / Math.max(dashboardData.tasks.total_unresolved, 1)) * 100} ${100 - (dashboardData.tasks.breakup.Call / Math.max(dashboardData.tasks.total_unresolved, 1)) * 100}`} 
                        strokeDashoffset="0" />
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="3" 
                        strokeDasharray={`${(dashboardData.tasks.breakup.Meeting / Math.max(dashboardData.tasks.total_unresolved, 1)) * 100} ${100 - (dashboardData.tasks.breakup.Meeting / Math.max(dashboardData.tasks.total_unresolved, 1)) * 100}`} 
                        strokeDashoffset={`-${(dashboardData.tasks.breakup.Call / Math.max(dashboardData.tasks.total_unresolved, 1)) * 100}`} />
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f59e0b" strokeWidth="3" 
                        strokeDasharray={`${(dashboardData.tasks.breakup.Email / Math.max(dashboardData.tasks.total_unresolved, 1)) * 100} ${100 - (dashboardData.tasks.breakup.Email / Math.max(dashboardData.tasks.total_unresolved, 1)) * 100}`} 
                        strokeDashoffset={`-${((dashboardData.tasks.breakup.Call + dashboardData.tasks.breakup.Meeting) / Math.max(dashboardData.tasks.total_unresolved, 1)) * 100}`} />
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#a855f7" strokeWidth="3" 
                        strokeDasharray={`${(dashboardData.tasks.breakup.Task / Math.max(dashboardData.tasks.total_unresolved, 1)) * 100} ${100 - (dashboardData.tasks.breakup.Task / Math.max(dashboardData.tasks.total_unresolved, 1)) * 100}`} 
                        strokeDashoffset={`-${((dashboardData.tasks.breakup.Call + dashboardData.tasks.breakup.Meeting + dashboardData.tasks.breakup.Email) / Math.max(dashboardData.tasks.total_unresolved, 1)) * 100}`} />
                    </svg>
                    <div className="crm-donut-center">
                      <div className="crm-donut-center-val">{dashboardData.tasks.total_unresolved}</div>
                      <div className="crm-donut-center-lbl">Total Tasks</div>
                    </div>
                  </div>
                </div>

                <div className="crm-chart-legend">
                  <div className="crm-legend-item"><span className="crm-legend-dot" style={{ background: '#3b82f6' }}></span> Calls ({dashboardData.tasks.breakup.Call})</div>
                  <div className="crm-legend-item"><span className="crm-legend-dot" style={{ background: '#10b981' }}></span> Meetings ({dashboardData.tasks.breakup.Meeting})</div>
                  <div className="crm-legend-item"><span className="crm-legend-dot" style={{ background: '#f59e0b' }}></span> Emails ({dashboardData.tasks.breakup.Email})</div>
                  <div className="crm-legend-item"><span className="crm-legend-dot" style={{ background: '#a855f7' }}></span> Tasks ({dashboardData.tasks.breakup.Task})</div>
                </div>
              </div>

              {/* LEADS BREAKUP (Investwell Replicating List) */}
              <div className="crm-widget-card">
                <div className="crm-widget-header">
                  <h3 className="crm-widget-title">Leads Funnel</h3>
                  <span style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>Sales pipeline</span>
                </div>
                <div className="crm-sub-grid-3" style={{ marginBottom: '15px' }}>
                  <div className="crm-mini-stat">
                    <div className="crm-mini-stat-label">Received Today</div>
                    <div className="crm-mini-stat-val">{dashboardData.leads.received_today}</div>
                  </div>
                  <div className="crm-mini-stat">
                    <div className="crm-mini-stat-label" style={{ color: 'var(--emerald)' }}>Won Today</div>
                    <div className="crm-mini-stat-val" style={{ color: 'var(--emerald)' }}>{dashboardData.leads.converted_today}</div>
                  </div>
                  <div className="crm-mini-stat">
                    <div className="crm-mini-stat-label">Total Active</div>
                    <div className="crm-mini-stat-val">{dashboardData.leads.total_pending}</div>
                  </div>
                </div>

                <div>
                  {Object.entries(dashboardData.leads.breakup).map(([statusName, val]) => {
                    const totalLeads = leads.length || 1;
                    const percent = (val / totalLeads) * 100;
                    let color = '#3b82f6';
                    if (statusName === 'Interested') color = '#f59e0b';
                    if (statusName === 'Qualified') color = '#a855f7';
                    if (statusName === 'Converted') color = '#10b981';
                    if (statusName === 'Lost') color = '#ef4444';

                    return (
                      <div className="crm-progress-item" key={statusName}>
                        <div className="crm-progress-header">
                          <span>{statusName}</span>
                          <span>{val} ({percent.toFixed(0)}%)</span>
                        </div>
                        <div className="crm-progress-bar">
                          <div className="crm-progress-fill" style={{ width: `${percent}%`, background: color }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        )}

        {crmSubTab === 'leads' && (
          <div>
            <h2 className="crm-section-title">Leads Funnel &amp; Register</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '30px' }}>
              
              {/* Leads Table */}
              <div className="crm-card" style={{ padding: '20px' }}>
                <h4 style={{ margin: '0 0 15px 0', color: 'var(--navy)' }}>Inbound Lead Records</h4>
                <div style={{ overflowX: 'auto' }}>
                  <table className="crm-table">
                    <thead>
                      <tr>
                        <th>Lead Name</th>
                        <th>Contact</th>
                        <th>Source</th>
                        <th>Status</th>
                        <th>Remarks</th>
                        <th>Created At</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.length === 0 ? (
                        <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>No leads registered. Add one using the form on the right.</td></tr>
                      ) : leads.map(l => (
                        <tr key={l.id}>
                          <td style={{ fontWeight: 700 }}>{l.name}</td>
                          <td>
                            <div style={{ fontSize: '0.85rem' }}>{l.email}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{l.phone}</div>
                          </td>
                          <td>{l.source}</td>
                          <td>
                            <span style={{
                              fontSize: '0.78rem', padding: '3px 8px', borderRadius: '12px', fontWeight: 700,
                              background: l.status === 'Converted' ? '#dcfce7' : l.status === 'Lost' ? '#fee2e2' : l.status === 'Qualified' ? '#f3e8ff' : '#f1f5f9',
                              color: l.status === 'Converted' ? '#15803d' : l.status === 'Lost' ? '#b91c1c' : l.status === 'Qualified' ? '#6b21a8' : '#334155'
                            }}>{l.status}</span>
                          </td>
                          <td style={{ fontSize: '0.82rem' }}>{l.remarks}</td>
                          <td style={{ fontSize: '0.8rem' }}>{new Date(l.created_at).toLocaleDateString('en-IN')}</td>
                          <td>
                            <button className="crm-btn-primary" onClick={() => handleDeleteLead(l.id)} style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'var(--rose)' }}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add Lead Form */}
              <div className="crm-card" style={{ padding: '20px' }}>
                <h4 style={{ margin: '0 0 15px 0', color: 'var(--navy)' }}>Add New Inbound Lead</h4>
                <form onSubmit={handleSaveLead} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="crm-form-group">
                    <label>Lead Full Name</label>
                    <input type="text" className="crm-form-control" placeholder="Enter full name" required value={lName} onChange={e => setLName(e.target.value)} />
                  </div>
                  <div className="crm-form-group">
                    <label>Email Address</label>
                    <input type="email" className="crm-form-control" placeholder="Enter email ID" value={lEmail} onChange={e => setLEmail(e.target.value)} />
                  </div>
                  <div className="crm-form-group">
                    <label>Phone Number</label>
                    <input type="text" className="crm-form-control" placeholder="Enter mobile no" value={lPhone} onChange={e => setLPhone(e.target.value)} />
                  </div>
                  <div className="crm-form-group">
                    <label>Lead Source</label>
                    <select className="crm-form-control" value={lSource} onChange={e => setLSource(e.target.value)}>
                      <option value="Website">Website Form</option>
                      <option value="Walk-in">Walk-in Inquiry</option>
                      <option value="Referral">Client Referral</option>
                      <option value="Cold Call">Cold Outreach</option>
                    </select>
                  </div>
                  <div className="crm-form-group">
                    <label>Funnel Status</label>
                    <select className="crm-form-control" value={lStatus} onChange={e => setLStatus(e.target.value)}>
                      <option value="Contacted">Contacted</option>
                      <option value="Interested">Interested</option>
                      <option value="Qualified">Qualified</option>
                      <option value="Converted">Converted (Won)</option>
                      <option value="Lost">Lost</option>
                    </select>
                  </div>
                  <div className="crm-form-group">
                    <label>Advisor Remarks</label>
                    <textarea className="crm-form-control" rows="2" placeholder="Enter notes..." value={lRemarks} onChange={e => setLRemarks(e.target.value)}></textarea>
                  </div>
                  <button type="submit" className="crm-btn-primary" style={{ padding: '10px' }}>Register Lead</button>
                </form>
              </div>

            </div>
          </div>
        )}

        {crmSubTab === 'clients' && (
          <div className="crm-client-flex">
            
            {/* Left Clients list */}
            <div className="crm-client-list-panel">
              <input 
                type="text" 
                className="crm-search-box" 
                placeholder="🔍 Search client list..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <button 
                className="crm-btn-primary" 
                style={{ width: '100%', marginBottom: '15px', padding: '8px' }}
                onClick={() => handleSelectClient(null)}
              >
                ➕ Create New Client Profile
              </button>

              {filteredClients.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)', fontSize: '0.85rem' }}>No clients found.</div>
              ) : filteredClients.map(c => (
                <div 
                  className={`crm-client-list-item ${selectedClient && selectedClient.username === c.username ? 'active' : ''}`}
                  key={c.id}
                  onClick={() => handleSelectClient(c)}
                >
                  <div className="crm-client-list-name">{c.name}</div>
                  <div className="crm-client-list-meta">
                    <span>AUM: ₹{c.aum.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    <span style={{ color: c.status === 'Active' ? 'var(--emerald)' : 'var(--rose)', fontWeight: 700 }}>{c.status}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Right details / form workspace */}
            <div className="crm-client-workspace-panel">
              
              {/* Profile creation or edit */}
              <div className="crm-card" style={{ border: 'none', padding: 0, boxShadow: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 className="crm-section-title" style={{ margin: 0 }}>
                    {selectedClient ? `Edit Client Profile: ${selectedClient.name}` : 'Provision New Client Portal Account'}
                  </h3>
                  {selectedClient && (
                    <button 
                      className="crm-btn-danger" 
                      onClick={() => handleDeleteClient(selectedClient.id)}
                      style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                    >
                      Delete Profile
                    </button>
                  )}
                </div>

                <form onSubmit={handleCreateClient}>
                  <div className="crm-form-grid">
                    <div className="crm-form-group">
                      <label>Client Full Name</label>
                      <input type="text" className="crm-form-control" required placeholder="Enter full name" value={cName} onChange={e => setCName(e.target.value)} />
                    </div>
                    <div className="crm-form-group">
                      <label>CRM Username (unique)</label>
                      <input
                        type="text"
                        className="crm-form-control"
                        required
                        placeholder="Assign a unique username"
                        value={cUsername}
                        onChange={e => { setCUsername(e.target.value); setUsernameError(''); }}
                        style={{ borderColor: usernameError ? '#ef4444' : '' }}
                      />
                      {usernameError && (
                        <div style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '4px', fontWeight: 600 }}>
                          ⚠️ {usernameError}
                        </div>
                      )}
                    </div>
                    <div className="crm-form-group">
                      <label>CRM Password</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className="crm-form-control"
                          required
                          placeholder="Assign a password"
                          value={cPassword}
                          onChange={e => setCPassword(e.target.value)}
                          style={{ paddingRight: '80px' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(p => !p)}
                          style={{
                            position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--blue)', fontSize: '0.78rem', fontWeight: 700, padding: '2px 6px',
                            borderRadius: '6px', whiteSpace: 'nowrap'
                          }}
                        >
                          {showPassword ? '🙈 Hide' : '👁 Show'}
                        </button>
                      </div>
                    </div>
                    <div className="crm-form-group">
                      <label>Email Address</label>
                      <input type="email" className="crm-form-control" required placeholder="Enter email" value={cEmail} onChange={e => setCEmail(e.target.value)} />
                    </div>
                    <div className="crm-form-group">
                      <label>Phone Number</label>
                      <input type="text" className="crm-form-control" required placeholder="Enter phone" value={cPhone} onChange={e => setCPhone(e.target.value)} />
                    </div>
                    <div className="crm-form-group">
                      <label>PAN Card Number</label>
                      <input type="text" className="crm-form-control" placeholder="Enter PAN" value={cPan} onChange={e => setCPan(e.target.value)} />
                    </div>
                    <div className="crm-form-group">
                      <label>Date of Birth (YYYY-MM-DD)</label>
                      <input type="text" className="crm-form-control" placeholder="e.g. 1990-03-13" value={cDob} onChange={e => setCDob(e.target.value)} />
                    </div>
                    <div className="crm-form-group">
                      <label>Assigned RM</label>
                      <input type="text" className="crm-form-control" value={cRm} onChange={e => setCRm(e.target.value)} />
                    </div>
                    <div className="crm-form-group">
                      <label>Address Info</label>
                      <input type="text" className="crm-form-control" placeholder="Enter city/address" value={cAddress} onChange={e => setCAddress(e.target.value)} />
                    </div>
                    <div className="crm-form-group">
                      <label>Account Status</label>
                      <select className="crm-form-control" value={cStatus} onChange={e => setCStatus(e.target.value)}>
                        <option value="Active">Active</option>
                        <option value="Deactivated">Deactivated</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="crm-btn-primary">
                    {selectedClient ? 'Save Profile Updates' : 'Provision Portal Credentials & Profile'}
                  </button>
                </form>
              </div>

              {/* Selected client additional management tabs (Holdings, Tasks) */}
              {selectedClient && (
                <div style={{ marginTop: '40px', borderTop: '1px solid #e2e8f0', paddingTop: '30px' }}>
                  
                  {/* Holdings manager */}
                  <div style={{ marginBottom: '40px' }}>
                    <h3 className="crm-section-title">Portfolio Assets Holdings Manager</h3>
                    
                    {loading ? <div className="admin-loader">Loading client holdings...</div> : (
                      <div>
                        {clientDetails.holdings.length === 0 ? (
                          <div style={{ padding: '15px 0', color: 'var(--muted)', fontSize: '0.9rem' }}>No portfolio holdings added yet. Use the form below to allocate holdings.</div>
                        ) : (
                          <table className="crm-table" style={{ fontSize: '0.85rem' }}>
                            <thead>
                              <tr>
                               <th>Scheme / Asset Name</th>
                               <th>Folio</th>
                               <th>Asset Class</th>
                               <th>Units</th>
                               <th>Buy NAV</th>
                               <th>Current NAV</th>
                               <th>Valuation</th>
                               <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {clientDetails.holdings.map(h => (
                                <tr key={h.id}>
                                  <td style={{ fontWeight: 700 }}>{h.scheme_name}</td>
                                  <td>{h.folio_number}</td>
                                  <td>{h.asset_class}</td>
                                  <td>{h.units.toFixed(2)}</td>
                                  <td>₹{h.purchase_price}</td>
                                  <td>₹{h.current_nav}</td>
                                  <td style={{ fontWeight: 700 }}>₹{h.current_value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                                  <td>
                                    <button className="crm-btn-primary" onClick={() => handleDeleteHolding(h.id)} style={{ padding: '3px 8px', fontSize: '0.75rem', background: 'var(--rose)' }}>Delete</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                        
                        {/* Add Holding Form */}
                        <form onSubmit={handleAddHolding} style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', marginTop: '20px' }}>
                          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--navy)' }}>Add Mutual Fund / Equity Asset Holding</h4>
                          <div className="crm-form-grid" style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
                            <div className="crm-form-group">
                              <label>Scheme / Stock Name</label>
                              <input type="text" className="crm-form-control" required placeholder="e.g. HDFC Mid-Cap Opportunities Fund" value={hScheme} onChange={e => setHScheme(e.target.value)} />
                            </div>
                            <div className="crm-form-group">
                              <label>Folio Number</label>
                              <input type="text" className="crm-form-control" placeholder="e.g. 1278485" value={hFolio} onChange={e => setHFolio(e.target.value)} />
                            </div>
                            <div className="crm-form-group">
                              <label>Asset Class</label>
                              <select className="crm-form-control" value={hAsset} onChange={e => setHAsset(e.target.value)}>
                                <option value="Equity">Equity</option>
                                <option value="Debt">Debt</option>
                                <option value="Hybrid">Hybrid</option>
                                <option value="Cash">Cash (Liquid)</option>
                                <option value="Gold">Gold</option>
                              </select>
                            </div>
                          </div>
                          <div className="crm-form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginTop: '10px' }}>
                            <div className="crm-form-group">
                              <label>Units Held</label>
                              <input type="number" step="any" className="crm-form-control" required placeholder="e.g. 125.5" value={hUnits} onChange={e => setHUnits(e.target.value)} />
                            </div>
                            <div className="crm-form-group">
                              <label>Buy NAV / Purchase Price (₹)</label>
                              <input type="number" step="any" className="crm-form-control" required placeholder="e.g. 120.5" value={hPrice} onChange={e => setHPrice(e.target.value)} />
                            </div>
                            <div className="crm-form-group">
                              <label>Current NAV (₹)</label>
                              <input type="number" step="any" className="crm-form-control" required placeholder="e.g. 145.8" value={hNav} onChange={e => setHNav(e.target.value)} />
                            </div>
                          </div>
                          <button type="submit" className="crm-btn-primary" style={{ marginTop: '12px', fontSize: '0.85rem', padding: '8px 16px' }}>Add Holding Record</button>
                        </form>
                      </div>
                    )}
                  </div>

                  {/* Tasks manager */}
                  <div>
                    <h3 className="crm-section-title">Client Tasks &amp; Interaction Logs Scheduler</h3>
                    
                    {loading ? <div className="admin-loader">Loading client tasks...</div> : (
                      <div>
                        {clientDetails.tasks.length === 0 ? (
                          <div style={{ padding: '15px 0', color: 'var(--muted)', fontSize: '0.9rem' }}>No advisor actions or follow-up calls scheduled for this client.</div>
                        ) : (
                          <div className="crm-timeline" style={{ marginBottom: '30px' }}>
                            {clientDetails.tasks.map(t => (
                              <div className="crm-timeline-item" key={t.id}>
                                <div className={`crm-timeline-badge ${t.type.toLowerCase()}`}>
                                  {t.type === 'Call' && <PhoneCall size={16} />}
                                  {t.type === 'Meeting' && <Users size={16} />}
                                  {t.type === 'Email' && <Mail size={16} />}
                                  {t.type === 'Task' && <Briefcase size={16} />}
                                </div>
                                <div className="crm-timeline-content" style={{ padding: '12px' }}>
                                  <div className="crm-timeline-title" style={{ fontSize: '0.9rem' }}>
                                    <span>{t.title}</span>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                      <button 
                                        onClick={() => handleToggleTask(t.id)}
                                        style={{
                                          fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', cursor: 'pointer', border: 'none',
                                          background: t.status === 'Completed' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                                          color: t.status === 'Completed' ? '#059669' : '#d97706',
                                          fontWeight: 700
                                        }}
                                      >
                                        {t.status} (Click to Toggle)
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteTask(t.id)}
                                        style={{ background: 'transparent', border: 'none', color: 'var(--rose)', cursor: 'pointer', fontSize: '0.8rem' }}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                  <p className="crm-timeline-desc" style={{ fontSize: '0.82rem', margin: '4px 0 0' }}>{t.description}</p>
                                  <div className="crm-timeline-meta" style={{ fontSize: '0.78rem', marginTop: '6px' }}>
                                    <span>Due Date: {t.due_date ? new Date(t.due_date).toLocaleDateString('en-IN') : 'Flexible'}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Add Task Form */}
                        <form onSubmit={handleAddTask} style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--navy)' }}>Schedule New Adviser Action / Follow-up</h4>
                          <div className="crm-form-grid" style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
                            <div className="crm-form-group">
                              <label>Task / Interaction Title</label>
                              <input type="text" className="crm-form-control" required placeholder="e.g. Schedule Mutual Fund Advisory call" value={tTitle} onChange={e => setTTitle(e.target.value)} />
                            </div>
                            <div className="crm-form-group">
                              <label>Interaction Type</label>
                              <select className="crm-form-control" value={tType} onChange={e => setTType(e.target.value)}>
                                <option value="Call">Phone Call</option>
                                <option value="Meeting">Meeting / Review</option>
                                <option value="Email">Email Communication</option>
                                <option value="Task">Task Action</option>
                              </select>
                            </div>
                            <div className="crm-form-group">
                              <label>Due Date</label>
                              <input type="date" className="crm-form-control" required value={tDue} onChange={e => setTDue(e.target.value)} />
                            </div>
                          </div>
                          <div className="crm-form-group" style={{ marginTop: '10px' }}>
                            <label>Interaction description / notes</label>
                            <input type="text" className="crm-form-control" placeholder="Enter notes or task details..." value={tDesc} onChange={e => setTDesc(e.target.value)} />
                          </div>
                          <button type="submit" className="crm-btn-primary" style={{ marginTop: '12px', fontSize: '0.85rem', padding: '8px 16px' }}>Schedule Action</button>
                        </form>
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   11. LEADS ADMIN DASHBOARD PAGE
   ═══════════════════════════════════════════════ */
function LeadsAdminPage({ cmsContent = {}, onCMSUpdate }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!sessionStorage.getItem('scsl_admin_auth'));
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // CAPTCHA variables
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const canvasRef = useRef(null);

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(code);
    setCaptchaInput('');
    
    // Draw in next tick so the canvas DOM node is fully rendered/updated
    setTimeout(() => {
      drawCaptcha(code);
    }, 50);
  };

  const drawCaptcha = (code) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Light gradient background
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#f8fafc');
    grad.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Noise background lines
    const lineColors = ['#cbd5e1', '#94a3b8', '#cbd5e1', '#e2e8f0'];
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = lineColors[Math.floor(Math.random() * lineColors.length)];
      ctx.lineWidth = Math.random() * 2 + 1;
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }

    // Text characters
    const fonts = ['Arial', 'Verdana', 'Courier New', 'Georgia', 'Trebuchet MS', 'Impact'];
    const textColors = ['#0f172a', '#1e293b', '#334155', '#475569', '#0284c7', '#0369a1', '#0f766e'];
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      const fontSize = Math.floor(Math.random() * 8) + 24; // 24 to 32px
      const font = fonts[Math.floor(Math.random() * fonts.length)];
      ctx.font = `bold ${fontSize}px ${font}`;
      ctx.fillStyle = textColors[Math.floor(Math.random() * textColors.length)];
      
      const x = 15 + i * 25 + Math.random() * 5;
      const y = canvas.height / 2 + (Math.random() * 10 - 5);
      const angle = (Math.random() * 30 - 15) * Math.PI / 180; // -15 to +15 deg
      
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillText(char, 0, 0);
      ctx.restore();
    }

    // Noise dots on top of the text
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = textColors[Math.floor(Math.random() * textColors.length)];
      ctx.beginPath();
      ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 1.5 + 0.5, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  const [leads, setLeads] = useState({ contacts: [], registrations: [], page_views: [], logins: [], account_openings: [], feedbacks: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [adminRole, setAdminRole] = useState('supervisor'); // 'admin' or 'supervisor'

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
      // Detect role by trying to call super-admin endpoint
      try {
        const roleRes = await fetch(`${API_BASE_URL}/api/admin/users`, {
          headers: { 'Authorization': authHeaderVal }
        });
        setAdminRole(roleRes.ok ? 'admin' : 'supervisor');
      } catch { setAdminRole('supervisor'); }
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
      generateCaptcha();
    }
  }, [isAuthenticated]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    
    // Check CAPTCHA
    if (captchaInput.trim().toUpperCase() !== captchaCode) {
      setLoginError('Invalid CAPTCHA code. Please try again.');
      generateCaptcha();
      return;
    }

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
        generateCaptcha();
      } else {
        setLoginError('Server error: ' + res.status);
        generateCaptcha();
      }
    } catch (err) {
      console.error(err);
      setLoginError('Could not connect to the backend server.');
      generateCaptcha();
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('scsl_admin_auth');
    setIsAuthenticated(false);
    setLeads({ contacts: [], registrations: [], page_views: [], logins: [], account_openings: [], feedbacks: [] });
    setUsernameInput('');
    setPasswordInput('');
    setLoginError('');
  };

  const handleToggleFeedback = async (id, currentApproval) => {
    const authHeaderVal = sessionStorage.getItem('scsl_admin_auth');
    try {
      const res = await fetch(`${API_BASE_URL}/api/feedback/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeaderVal || '' },
        body: JSON.stringify({ id, is_approved: !currentApproval })
      });
      if (res.ok) fetchLeads();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (type, id) => {
    const typeLabel = type === 'contact' ? 'lead' : type === 'registration' ? 'webinar registration' : type === 'feedback' ? 'feedback entry' : 'account opening request';
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

  const handleApprovePayment = async (regId) => {
    if (!window.confirm('Approve payment for this registration? This will mark it as paid and automatically send the meeting confirmation email containing the join link.')) return;
    const authHeaderVal = sessionStorage.getItem('scsl_admin_auth');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/registrations/approve-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeaderVal || '' },
        body: JSON.stringify({ registration_id: regId })
      });
      if (res.ok) {
        alert('Payment approved successfully! Confirmation email queued.');
        fetchLeads();
      } else {
        const errData = await res.json();
        alert('Failed to approve payment: ' + (errData.detail || 'Server error'));
      }
    } catch (err) {
      console.error(err);
      alert('Error approving payment.');
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

  const filteredFeedbacks = (leads.feedbacks || []).filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.email.toLowerCase().includes(search.toLowerCase()) ||
    (f.comment && f.comment.toLowerCase().includes(search.toLowerCase()))
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
              <div style={{ position: 'relative' }}>
                <input 
                  type={showAdminPassword ? "text" : "password"} 
                  placeholder="Enter your password" 
                  required 
                  value={passwordInput} 
                  onChange={e => setPasswordInput(e.target.value)} 
                  disabled={loggingIn}
                  style={{
                    width: '100%',
                    padding: '12px 50px 12px 16px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    background: 'var(--white)',
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'var(--transition)'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(p => !p)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--blue)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    padding: '4px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {showAdminPassword ? '🙈 Hide' : '👁 Show'}
                </button>
              </div>
            </div>

            <div className="mform-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--navy)' }}>Security Code</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <canvas 
                  ref={canvasRef} 
                  width="180" 
                  height="46" 
                  style={{ 
                    borderRadius: '10px', 
                    border: '1px solid #CBD5E1',
                    background: '#f1f5f9',
                    display: 'block'
                  }}
                />
                <button 
                  type="button" 
                  onClick={generateCaptcha}
                  className="btn-ghost"
                  style={{
                    padding: '8px 12px',
                    fontSize: '0.85rem',
                    border: '1.5px solid var(--sky)',
                    color: 'var(--blue)',
                    background: 'transparent',
                    cursor: 'pointer',
                    borderRadius: '10px',
                    height: '46px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Generate new CAPTCHA"
                >
                  🔄 Refresh
                </button>
              </div>
              
              <input 
                type="text" 
                placeholder="Enter the code shown above" 
                required 
                value={captchaInput} 
                onChange={e => setCaptchaInput(e.target.value)} 
                disabled={loggingIn}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  background: 'var(--white)',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'var(--transition)',
                  marginTop: '4px',
                  textTransform: 'uppercase'
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
        
        {/* Header */}
        <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '30px' }}>
          <div>
            <h1 className="admin-title">
              {activeTab === 'dashboard' ? 'SCSL Admin Portal' : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button 
                    onClick={() => { setActiveTab('dashboard'); setSearch(''); }} 
                    className="btn-ghost" 
                    style={{ padding: '6px 12px', fontSize: '0.85rem', border: '1.5px solid var(--sky)', color: 'var(--blue)', background: 'transparent', cursor: 'pointer', borderRadius: '8px' }}
                  >
                    ⬅ Back
                  </button>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--navy)' }}>
                    {activeTab === 'contacts' && '📞 Contact Leads'}
                    {activeTab === 'registrations' && '🎓 Webinar Registrations'}
                    {activeTab === 'accounts' && '📝 Account Openings'}
                    {activeTab === 'webinars' && '📹 Manage Webinars'}
                    {activeTab === 'analytics' && '📈 Site Analytics'}
                    {activeTab === 'feedbacks' && '💬 Customer Reviews'}
                    {activeTab === 'cms' && '✏️ Homepage CMS'}
                    {activeTab === 'crm' && '📊 Client CRM Suite'}
                    {activeTab === 'admins' && '👥 Staff Admins'}
                    {activeTab === 'settings' && '⚙️ System Settings'}
                  </span>
                </div>
              )}
            </h1>
            {activeTab === 'dashboard' && <p className="admin-subtitle">Monitor inquiries, registrations, and account applications stored in cloud database</p>}
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button className="btn-solid refresh-btn" onClick={fetchLeads} style={{ border: 'none', cursor: 'pointer' }}>Refresh Data</button>
            <button className="btn-ghost" onClick={handleLogout} style={{ border: '1.5px solid var(--sky)', color: 'var(--blue)', background: 'transparent', cursor: 'pointer' }}>Logout</button>
          </div>
        </div>

        {error && (
          <div className="admin-error-banner" style={{ marginBottom: '20px' }}>
            <p>⚠️ {error}</p>
          </div>
        )}

        {/* Dashboard Hub View */}
        {activeTab === 'dashboard' ? (
          <div>
            {/* Stats Summary Cards */}
            <div className="admin-stats-grid" style={{ marginBottom: '30px' }}>
              <div className="astat-card" onClick={() => setActiveTab('contacts')} style={{ cursor: 'pointer' }}>
                <h4>General Inquiries</h4>
                <div className="astat-val">{leads.contacts.length}</div>
                <p>Contact form submissions</p>
              </div>
              <div className="astat-card" onClick={() => setActiveTab('registrations')} style={{ cursor: 'pointer' }}>
                <h4>Webinar Registrations</h4>
                <div className="astat-val">{leads.registrations.length}</div>
                <p>Seats booked across all topics</p>
              </div>
              <div className="astat-card" onClick={() => setActiveTab('accounts')} style={{ cursor: 'pointer' }}>
                <h4>Account Openings</h4>
                <div className="astat-val">{(leads.account_openings || []).length}</div>
                <p>Demat & Trading account applications</p>
              </div>
            </div>

            {/* Options Hub Menu Grid */}
            <h3 style={{ color: 'var(--navy)', fontWeight: 800, fontSize: '1.2rem', marginBottom: '20px' }}>Admin Action Workspace</h3>
            <div className="admin-menu-grid">
              
              <div className="admin-menu-card" onClick={() => setActiveTab('contacts')}>
                <div className="menu-card-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>📞</div>
                <div className="menu-card-body">
                  <div className="menu-card-title">
                    <span>Contact Leads</span>
                    <span className="menu-card-badge">{leads.contacts.length}</span>
                  </div>
                  <p className="menu-card-desc">View and manage support/contact inquiries from the website form.</p>
                </div>
              </div>

              <div className="admin-menu-card" onClick={() => setActiveTab('registrations')}>
                <div className="menu-card-icon" style={{ background: '#f5f3ff', color: '#8b5cf6' }}>🎓</div>
                <div className="menu-card-body">
                  <div className="menu-card-title">
                    <span>Webinar Registrations</span>
                    <span className="menu-card-badge">{leads.registrations.length}</span>
                  </div>
                  <p className="menu-card-desc">Approve or track users who booked a seat for webinars.</p>
                </div>
              </div>

              <div className="admin-menu-card" onClick={() => setActiveTab('accounts')}>
                <div className="menu-card-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>📝</div>
                <div className="menu-card-body">
                  <div className="menu-card-title">
                    <span>Account Openings</span>
                    <span className="menu-card-badge">{(leads.account_openings || []).length}</span>
                  </div>
                  <p className="menu-card-desc">Manage demat and trading account onboarding requests.</p>
                </div>
              </div>

              <div className="admin-menu-card" onClick={() => setActiveTab('webinars')}>
                <div className="menu-card-icon" style={{ background: '#fff7ed', color: '#f97316' }}>📹</div>
                <div className="menu-card-body">
                  <div className="menu-card-title">
                    <span>Manage Webinars</span>
                  </div>
                  <p className="menu-card-desc">Schedule, edit, or delete interactive webinar slots.</p>
                </div>
              </div>

              <div className="admin-menu-card" onClick={() => setActiveTab('analytics')}>
                <div className="menu-card-icon" style={{ background: '#f0fdfa', color: '#14b8a6' }}>📈</div>
                <div className="menu-card-body">
                  <div className="menu-card-title">
                    <span>Site Analytics</span>
                  </div>
                  <p className="menu-card-desc">Inspect browser, visitor IP, and page-view metrics.</p>
                </div>
              </div>

              <div className="admin-menu-card" onClick={() => setActiveTab('feedbacks')}>
                <div className="menu-card-icon" style={{ background: '#fffbeb', color: '#f59e0b' }}>💬</div>
                <div className="menu-card-body">
                  <div className="menu-card-title">
                    <span>Customer Reviews</span>
                    <span className="menu-card-badge">{(leads.feedbacks || []).length}</span>
                  </div>
                  <p className="menu-card-desc">Moderate and approve testimonials visible on the homepage.</p>
                </div>
              </div>

              <div className="admin-menu-card" onClick={() => setActiveTab('cms')}>
                <div className="menu-card-icon" style={{ background: '#fdf2f8', color: '#ec4899' }}>✏️</div>
                <div className="menu-card-body">
                  <div className="menu-card-title">
                    <span>Homepage CMS</span>
                  </div>
                  <p className="menu-card-desc">Edit hero text, subheadings, and slides dynamically.</p>
                </div>
              </div>

              <div className="admin-menu-card" onClick={() => setActiveTab('crm')}>
                <div className="menu-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>📊</div>
                <div className="menu-card-body">
                  <div className="menu-card-title">
                    <span>Client CRM Console</span>
                  </div>
                  <p className="menu-card-desc">Manage client login credentials, portfolios, AUM, and scheduled calls.</p>
                </div>
              </div>

              {adminRole === 'admin' && (
                <>
                  <div className="admin-menu-card" onClick={() => setActiveTab('admins')}>
                    <div className="menu-card-icon" style={{ background: '#f1f5f9', color: '#64748b' }}>👥</div>
                    <div className="menu-card-body">
                      <div className="menu-card-title">
                        <span>Manage Admins</span>
                      </div>
                      <p className="menu-card-desc">Control staff access, add new administrative users, and assign roles.</p>
                    </div>
                  </div>

                  <div className="admin-menu-card" onClick={() => setActiveTab('settings')}>
                    <div className="menu-card-icon" style={{ background: '#fafaf9', color: '#78716c' }}>⚙️</div>
                    <div className="menu-card-body">
                      <div className="menu-card-title">
                        <span>System Settings</span>
                      </div>
                      <p className="menu-card-desc">Configure system keys, Razorpay API integrations, and configurations.</p>
                    </div>
                  </div>
                </>
              )}

            </div>
          </div>
        ) : (
          <div>
            {/* Search wrap: only show for lists that benefit from search */}
            {['contacts', 'registrations', 'accounts', 'feedbacks'].includes(activeTab) && (
              <div className="admin-search-wrap" style={{ marginBottom: '20px', maxWidth: '480px' }}>
                <input 
                  type="text" 
                  placeholder="Search list records..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  className="admin-search-input"
                />
              </div>
            )}
          </div>
        )}

        {loading && activeTab !== 'dashboard' ? (
          <div className="admin-loader">Loading records from database...</div>
        ) : activeTab === 'crm' ? (
          <AdminCRMTab authHeader={sessionStorage.getItem('scsl_admin_auth')} />
        ) : activeTab === 'contacts' ? (
          <div className="admin-table-container">
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 0 0 0' }}>
              <a href={`${API_BASE_URL}/api/export/contacts`} onClick={e => { e.preventDefault(); const a = document.createElement('a'); a.href = `${API_BASE_URL}/api/export/contacts`; const auth = sessionStorage.getItem('scsl_admin_auth'); fetch(a.href, { headers: { Authorization: auth } }).then(r => r.blob()).then(b => { const url = URL.createObjectURL(b); a.href = url; a.download = 'contacts.csv'; a.click(); }); }} className="btn-solid" style={{ padding: '8px 18px', fontSize: '0.85rem', textDecoration: 'none', border: 'none', cursor: 'pointer' }}>⬇ Export CSV</a>
            </div>
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
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 0 0 0' }}>
              <a onClick={e => { e.preventDefault(); const auth = sessionStorage.getItem('scsl_admin_auth'); fetch(`${API_BASE_URL}/api/export/registrations`, { headers: { Authorization: auth } }).then(r => r.blob()).then(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'registrations.csv'; a.click(); }); }} className="btn-solid" style={{ padding: '8px 18px', fontSize: '0.85rem', textDecoration: 'none', border: 'none', cursor: 'pointer' }}>⬇ Export CSV</a>
            </div>
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
                    <th>Payment</th>
                    <th>Details / UTR</th>
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
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ 
                            background: r.payment_status === 'paid' ? '#dcfce7' : r.payment_status === 'pending' ? '#fee2e2' : '#e2e8f0', 
                            color: r.payment_status === 'paid' ? '#16a34a' : r.payment_status === 'pending' ? '#dc2626' : '#475569', 
                            padding: '3px 10px', 
                            borderRadius: '20px', 
                            fontSize: '0.78rem', 
                            fontWeight: 600, 
                            display: 'inline-block' 
                          }}>
                            {r.payment_status === 'paid' ? `✓ Paid` : r.payment_status === 'pending' ? 'Pending' : 'Free'}
                          </span>
                          {r.payment_status === 'pending' && (
                            <button
                              onClick={() => handleApprovePayment(r.id)}
                              style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                              title="Verify payment and send confirmation email"
                            >
                              ✓ Approve
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#555', fontFamily: 'monospace' }}>{r.payment_utr || '—'}</td>
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
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 0 0 0' }}>
              <a onClick={e => { e.preventDefault(); const auth = sessionStorage.getItem('scsl_admin_auth'); fetch(`${API_BASE_URL}/api/export/accounts`, { headers: { Authorization: auth } }).then(r => r.blob()).then(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'account_openings.csv'; a.click(); }); }} className="btn-solid" style={{ padding: '8px 18px', fontSize: '0.85rem', textDecoration: 'none', border: 'none', cursor: 'pointer' }}>⬇ Export CSV</a>
            </div>
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
          <WebinarManageTab authHeader={sessionStorage.getItem('scsl_admin_auth') || ''} allRegistrations={leads.registrations} onRefresh={fetchLeads} />
        ) : activeTab === 'feedbacks' ? (
          <div className="admin-table-container">
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 0 0 0' }}>
              <a onClick={e => { e.preventDefault(); const auth = sessionStorage.getItem('scsl_admin_auth'); fetch(`${API_BASE_URL}/api/export/feedbacks`, { headers: { Authorization: auth } }).then(r => r.blob()).then(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'feedbacks.csv'; a.click(); }); }} className="btn-solid" style={{ padding: '8px 18px', fontSize: '0.85rem', textDecoration: 'none', border: 'none', cursor: 'pointer' }}>⬇ Export CSV</a>
            </div>
            {filteredFeedbacks.length === 0 ? (
              <div className="admin-empty">No feedback submissions yet.</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Rating</th>
                    <th>Comment</th>
                    <th>Submitted At</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFeedbacks.map(f => (
                    <tr key={f.id}>
                      <td>#{f.id}</td>
                      <td className="bold">{f.name}</td>
                      <td><a href={`mailto:${f.email}`}>{f.email}</a></td>
                      <td style={{ color: '#FFD700', fontWeight: 700 }}>{'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}</td>
                      <td className="message-cell">{f.comment}</td>
                      <td>{new Date(f.timestamp).toLocaleString()}</td>
                      <td>
                        <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, background: f.is_approved ? 'rgba(5,150,105,0.12)' : 'rgba(239,68,68,0.12)', color: f.is_approved ? '#059669' : '#dc2626' }}>
                          {f.is_approved ? 'Published' : 'Hidden'}
                        </span>
                      </td>
                      <td style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleToggleFeedback(f.id, f.is_approved)}
                          style={{ background: f.is_approved ? 'rgba(239,68,68,0.1)' : 'rgba(5,150,105,0.1)', color: f.is_approved ? '#dc2626' : '#059669', padding: '6px 12px', borderRadius: '50px', fontWeight: 700, fontSize: '0.78rem', border: '1px solid transparent', cursor: 'pointer' }}
                        >
                          {f.is_approved ? 'Hide' : 'Publish'}
                        </button>
                        <button className="delete-btn" onClick={() => handleDelete('feedback', f.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : activeTab === 'admins' ? (
          <AdminUsersTab authHeader={sessionStorage.getItem('scsl_admin_auth') || ''} />
        ) : activeTab === 'settings' ? (
          <SystemSettingsTab authHeader={sessionStorage.getItem('scsl_admin_auth') || ''} />
        ) : activeTab === 'cms' ? (
          <HomepageCMSTab authHeader={sessionStorage.getItem('scsl_admin_auth') || ''} cmsContent={cmsContent} onCMSUpdate={onCMSUpdate} />
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
   11b. TABBED MARKET SEARCH DASHBOARD
   ═══════════════════════════════════════════════ */
function MarketSearchDashboard() {
  const [activeTab, setActiveTab] = useState("equity");
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [tickerNews, setTickerNews] = useState([]);
  const [selectedNews, setSelectedNews] = useState(null);
  const [detailedNews, setDetailedNews] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [relativeTimeStr, setRelativeTimeStr] = useState("just now");

  const tabs = [
    { id: "news", label: "News", icon: Newspaper },
    { id: "equity", label: "Equity", icon: TrendingUp },
    { id: "mf", label: "MFs", icon: PiggyBank },
    { id: "commodity", label: "Commodity", icon: Coins },
    { id: "ipo", label: "IPOs", icon: Rocket },
    { id: "futures", label: "Futures", icon: Activity },
    { id: "currency", label: "Currency", icon: Globe },
    { id: "indices", label: "Indices", icon: Landmark },
    { id: "research", label: "Research", icon: FileText },
    { id: "bonds", label: "Bonds", icon: CreditCard }
  ];

  const fetchSearchData = async (query, category, isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}&category=${category}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setLastUpdated(new Date());
      } else {
        setError("Failed to retrieve market data. Please verify your connection.");
      }
    } catch (err) {
      console.error("Fetch search error:", err);
      setError("Unable to contact market API server.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTickerNews = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/live-news`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setTickerNews(data);
        }
      }
    } catch (err) {
      console.error("Ticker news error:", err);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchSearchData(searchTerm, activeTab, false);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, activeTab]);

  useEffect(() => {
    fetchTickerNews();
    const interval = setInterval(fetchTickerNews, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!lastUpdated) return;
    const updateTime = () => {
      const diffMs = new Date().getTime() - lastUpdated.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      if (diffSecs < 10) {
        setRelativeTimeStr("just now");
      } else if (diffSecs < 60) {
        setRelativeTimeStr(`${diffSecs}s ago`);
      } else {
        const diffMins = Math.floor(diffSecs / 60);
        setRelativeTimeStr(`${diffMins}m ago`);
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 5000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  useEffect(() => {
    if (!selectedNews) {
      setDetailedNews(null);
      return;
    }
    if (selectedNews.id >= 1000) {
      setDetailedNews({
        heading: selectedNews.heading,
        caption: selectedNews.caption,
        date: selectedNews.date,
        time: selectedNews.time,
        section: selectedNews.section,
        arttext: `Global market report for this ticker. For the complete story, visit the original publisher: <a href="${selectedNews.link}" target="_blank" style="color: #0077B6; text-decoration: underline;">${selectedNews.caption}</a>`
      });
      return;
    }
    const fetchDetail = async () => {
      setLoadingDetail(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/live-news/${selectedNews.id}`);
        if (res.ok) {
          const data = await res.json();
          setDetailedNews(data);
        }
      } catch (err) {
        console.error("News details error:", err);
      } finally {
        setLoadingDetail(false);
      }
    };
    fetchDetail();
  }, [selectedNews]);

  const handleManualRefresh = () => {
    fetchSearchData(searchTerm, activeTab, true);
  };

  const getPlaceholder = () => {
    switch(activeTab) {
      case "equity": return "Search equities (e.g. Reliance, TCS, SBIN)...";
      case "mf": return "Search mutual funds (e.g. HDFC, SBI, ICICI)...";
      case "commodity": return "Search commodities (e.g. Gold, Crude)...";
      case "news": return "Filter market news by keyword...";
      case "currency": return "Search currency pairs (e.g. USD, EUR)...";
      case "indices": return "Search index names (e.g. Nifty, Sensex)...";
      case "futures": return "Search derivatives & futures contracts...";
      case "ipo": return "Search active & listed IPOs...";
      case "research": return "Search stock research & ratings...";
      case "bonds": return "Search treasury bills & corporate bonds...";
      default: return "Search markets...";
    }
  };

  const getQuoteStats = (symbol) => {
    const seed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const pe = (seed % 35 + 10).toFixed(2);
    const cap = ((seed * 1234567) % 500000 + 10000).toLocaleString('en-IN');
    const vol = ((seed * 4321) % 50000 + 500).toLocaleString('en-IN');
    const high = (seed % 200 + 50).toFixed(2);
    const low = (seed % 200 + 10).toFixed(2);
    return { pe, cap, vol, high, low };
  };

  return (
    <section className="market-search-section">
      {tickerNews.length > 0 && (
        <NewsTicker items={tickerNews} onSelect={setSelectedNews} />
      )}
      
      <div className="container" style={{ marginTop: '20px' }}>
        <div className="search-dashboard-card">
          <div className="search-header-container">
            <span className="search-indicator-tag">
              <span className="live-indicator-pulse"></span> LIVE MARKET DASHBOARD
            </span>
            <div className="search-meta-row">
              <h2 className="search-dashboard-title">Real-Time Search Hub</h2>
              {lastUpdated && (
                <div className="search-time-indicator">
                  <Clock size={14} style={{ marginRight: '6px' }} />
                  <span>Last updated: {relativeTimeStr}</span>
                  <button onClick={handleManualRefresh} className="btn-icon-refresh" aria-label="Refresh Market Data">
                    <RefreshCw size={14} className={loading ? "spin-animate" : ""} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="search-bar-wrap">
            <Search className="search-icon-glass" size={20} />
            <input 
              type="text" 
              className="search-input-field" 
              placeholder={getPlaceholder()}
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="clear-search-btn" onClick={() => setSearchTerm("")}>
                <X size={16} />
              </button>
            )}
          </div>

          <div className="tabs-navigation-scroll">
            <div className="tabs-navigation-container">
              {tabs.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button 
                    key={tab.id} 
                    className={`tab-navigation-button ${isActive ? "active" : ""}`}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setResults([]);
                    }}
                  >
                    <TabIcon size={16} style={{ marginRight: '8px' }} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="search-results-panel">
            {loading ? (
              <div className="search-state-loading">
                <div className="news-spinner"></div>
                <p>Retrieving real-time {activeTab} parameters...</p>
              </div>
            ) : error ? (
              <div className="search-state-error">
                <span className="error-icon-alert">⚠️</span>
                <p>{error}</p>
                <button className="btn-solid" onClick={handleManualRefresh} style={{ marginTop: '15px' }}>Retry Fetch</button>
              </div>
            ) : results.length === 0 ? (
              <div className="search-state-empty">
                <Compass size={48} className="empty-state-compass" />
                <h3>No records found</h3>
                <p>Try searching for a different ticker, company, or mutual fund key.</p>
              </div>
            ) : (
              <div className="results-render-grid">
                {activeTab === "news" && results.map((item) => (
                  <div key={item.id} className="news-card-item" onClick={() => setSelectedNews(item)}>
                    <div className="news-card-badge-row">
                      <span className="news-card-badge">{item.section}</span>
                      <span className="news-card-time">{item.date} {item.time}</span>
                    </div>
                    <h4 className="news-card-heading">{item.heading}</h4>
                    <p className="news-card-caption">{item.caption}</p>
                    <span className="read-more-link-text">Read Full Story &rarr;</span>
                  </div>
                ))}

                {["equity", "mf", "commodity", "currency", "indices", "futures"].includes(activeTab) && results.map((item) => (
                  <div 
                    key={item.symbol} 
                    className="scrip-card-item"
                    onClick={() => setSelectedQuote(item)}
                  >
                    <div className="scrip-card-header">
                      <div className="scrip-title-info">
                        <span className="scrip-symbol-tag">{item.symbol}</span>
                        <span className="scrip-exchange-badge">{item.exchange}</span>
                      </div>
                      <span className={`scrip-change-indicator ${item.up ? "positive" : "negative"}`}>
                        {item.up ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      </span>
                    </div>
                    <h4 className="scrip-company-name">{item.name}</h4>
                    <div className="scrip-price-block">
                      <span className="scrip-current-price">
                        {activeTab === "currency" ? "" : "₹"}{item.price}
                      </span>
                      <div className={`scrip-percent-change ${item.up ? "positive" : "negative"}`}>
                        <span>{item.change}</span>
                        <span style={{ marginLeft: '6px' }}>({item.percent})</span>
                      </div>
                    </div>
                    
                    <div className="sparkline-container">
                      <svg viewBox="0 0 100 30" className="sparkline-svg">
                        <path 
                          d={item.up 
                            ? "M 0 25 Q 15 15 30 18 T 60 10 T 80 15 T 100 5" 
                            : "M 0 10 Q 15 20 30 15 T 60 25 T 80 20 T 100 28"}
                          fill="none" 
                          stroke={item.up ? "#10b981" : "#ef4444"} 
                          strokeWidth="2"
                        />
                      </svg>
                    </div>
                  </div>
                ))}

                {activeTab === "ipo" && results.map((item, idx) => (
                  <div key={idx} className="ipo-card-item">
                    <div className="ipo-card-badge-row">
                      <span className={`ipo-status-badge ${item.status.toLowerCase()}`}>{item.status}</span>
                      <span className="ipo-card-date">{item.date}</span>
                    </div>
                    <h4 className="ipo-company-name">{item.company}</h4>
                    <div className="ipo-details-grid">
                      <div className="ipo-detail-col">
                        <span className="ipo-label">Price Band</span>
                        <span className="ipo-val">{item.price_band}</span>
                      </div>
                      <div className="ipo-detail-col">
                        <span className="ipo-label">Issue Size</span>
                        <span className="ipo-val">{item.size}</span>
                      </div>
                      <div className="ipo-detail-col">
                        <span className="ipo-label">Subscription</span>
                        <span className="ipo-val">{item.subscription}</span>
                      </div>
                      {item.current_price && (
                        <div className="ipo-detail-col">
                          <span className="ipo-label">Current Price</span>
                          <span className="ipo-val" style={{ color: '#10b981', fontWeight: 'bold' }}>{item.current_price}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {activeTab === "research" && results.map((item, idx) => (
                  <div key={idx} className="research-card-item">
                    <div className="research-header">
                      <div className="research-title">
                        <span className="research-symbol">{item.symbol}</span>
                        <span className="research-name">{item.name}</span>
                      </div>
                      <span className={`research-rating-badge ${item.rating.toLowerCase()}`}>{item.rating}</span>
                    </div>
                    <div className="research-price-targets">
                      <div className="target-box">
                        <span className="target-label">Target Price</span>
                        <span className="target-val" style={{ color: '#0077B6', fontWeight: 'bold' }}>{item.target}</span>
                      </div>
                      <div className="target-box">
                        <span className="target-label">Current Price</span>
                        <span className="target-val">{item.cmp}</span>
                      </div>
                    </div>
                    <p className="research-summary">{item.summary}</p>
                    <div className="research-footer">
                      <span className="broker-tag">{item.broker}</span>
                      <span className="report-disclaimer">Investment Advisory Report</span>
                    </div>
                  </div>
                ))}

                {activeTab === "bonds" && results.map((item, idx) => (
                  <div key={idx} className="bond-card-item">
                    <div className="bond-header">
                      <span className="bond-type-badge">{item.type}</span>
                      <span className="bond-rating-badge">{item.rating}</span>
                    </div>
                    <h4 className="bond-name">{item.name}</h4>
                    <div className="bond-details-row">
                      <div className="bond-detail-box">
                        <span className="bond-label">Coupon Rate</span>
                        <span className="bond-val">{item.coupon}</span>
                      </div>
                      <div className="bond-detail-box">
                        <span className="bond-label">Yield (YTM)</span>
                        <span className="bond-val" style={{ color: '#10b981' }}>{item.yield}</span>
                      </div>
                      <div className="bond-detail-box">
                        <span className="bond-label">Maturity</span>
                        <span className="bond-val">{item.maturity}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedNews && (
          <motion.div 
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedNews(null)}
          >
            <motion.div 
              className="news-modal-content"
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="modal-close-btn" onClick={() => setSelectedNews(null)} aria-label="Close story">
                <X size={20} />
              </button>
              
              {loadingDetail ? (
                <div className="modal-loading-block">
                  <div className="news-spinner"></div>
                  <p>Retrieving complete story details...</p>
                </div>
              ) : detailedNews ? (
                <div className="news-detail-container">
                  <div className="news-detail-header">
                    <div className="news-detail-meta">
                      <span className="news-detail-badge">{detailedNews.section || "Live News"}</span>
                      <span className="news-detail-time">{detailedNews.date} {detailedNews.time}</span>
                    </div>
                    <h3 className="news-detail-heading">{detailedNews.heading}</h3>
                    {detailedNews.caption && <p className="news-detail-caption">{detailedNews.caption}</p>}
                  </div>
                  
                  {detailedNews.IllustrationImage && (
                    <div className="news-detail-img-wrap">
                      <img src={detailedNews.IllustrationImage} alt="Illustration" className="news-detail-img" />
                    </div>
                  )}
                  
                  <div className="news-detail-body">
                    {detailedNews.arttext ? (
                      detailedNews.arttext.split('<P>').map((para, i) => (
                        <p key={i} dangerouslySetInnerHTML={{ __html: para.trim() }} />
                      ))
                    ) : (
                      <p>Full story text is currently unavailable. Please check back later.</p>
                    )}
                  </div>
                  
                  {detailedNews.KeyWords && (
                    <div className="news-detail-keywords">
                      <strong>Keywords:</strong> {detailedNews.KeyWords}
                    </div>
                  )}
                </div>
              ) : (
                <div className="modal-error-block">
                  <p>Error retrieving story text. Please verify your connection.</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedQuote && (
          <motion.div 
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedQuote(null)}
          >
            <motion.div 
              className="quote-modal-content"
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="modal-close-btn" onClick={() => setSelectedQuote(null)} aria-label="Close details">
                <X size={20} />
              </button>
              
              <div className="quote-detail-container">
                <div className="quote-detail-header">
                  <div className="quote-meta-row">
                    <span className="quote-exchange-badge">{selectedQuote.exchange}</span>
                    <span className="quote-symbol">{selectedQuote.symbol}</span>
                  </div>
                  <h3 className="quote-name">{selectedQuote.name}</h3>
                  <div className="quote-price-row">
                    <span className="quote-price">₹{selectedQuote.price}</span>
                    <span className={`quote-change ${selectedQuote.up ? "positive" : "negative"}`}>
                      {selectedQuote.change} ({selectedQuote.percent})
                    </span>
                  </div>
                </div>

                <div className="quote-stats-grid">
                  <div className="quote-stat-box">
                    <span className="stat-label">Market Capitalisation</span>
                    <span className="stat-val">₹{getQuoteStats(selectedQuote.symbol).cap} Cr</span>
                  </div>
                  <div className="quote-stat-box">
                    <span className="stat-label">P/E Ratio</span>
                    <span className="stat-val">{getQuoteStats(selectedQuote.symbol).pe}</span>
                  </div>
                  <div className="quote-stat-box">
                    <span className="stat-label">Traded Volume (24h)</span>
                    <span className="stat-val">{getQuoteStats(selectedQuote.symbol).vol} shares</span>
                  </div>
                  <div className="quote-stat-box">
                    <span className="stat-label">Day's High / Low</span>
                    <span className="stat-val">₹{getQuoteStats(selectedQuote.symbol).high} / ₹{getQuoteStats(selectedQuote.symbol).low}</span>
                  </div>
                </div>

                <div className="quote-modal-actions">
                  <a href="https://www.steelcitynettrade.com" target="_blank" rel="noreferrer" className="btn-solid" style={{ textAlign: 'center', textDecoration: 'none' }}>
                    Place Order via SCSL
                  </a>
                  <button className="btn-ghost" onClick={() => setSelectedQuote(null)}>
                    Dismiss View
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

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
      handleRegisterSubmit(otp);
    }
  };

  const handleRegisterSubmit = async (otpValue) => {
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
          payment_utr: ''
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

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const initRes = await fetch(`${API_BASE_URL}/api/payment/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          webinar_id: webinar.id,
          topic: webinar.topic,
          date: `${webinar.date} · ${webinar.time}`,
          otp: otp
        })
      });
      
      if (!initRes.ok) {
        const errData = await initRes.json();
        alert(errData.detail || 'Failed to initiate payment. Please try again.');
        setSubmitting(false);
        return;
      }
      
      const orderInfo = await initRes.json();
      
      const options = {
        key: orderInfo.key_id,
        amount: orderInfo.amount,
        currency: orderInfo.currency,
        name: 'Steel City Securities',
        description: webinar.topic,
        order_id: orderInfo.order_id,
        handler: async function (response) {
          setSubmitting(true);
          try {
            const verifyRes = await fetch(`${API_BASE_URL}/api/payment/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                registration_id: orderInfo.registration_id
              })
            });
            
            if (verifyRes.ok) {
              setSuccess(true);
            } else {
              const errData = await verifyRes.json();
              alert(errData.detail || 'Payment verification failed. Please contact support.');
            }
          } catch (err) {
            console.error('Payment verify error:', err);
            alert('Error verifying payment with server.');
          } finally {
            setSubmitting(false);
          }
        },
        prefill: {
          name: form.name,
          email: form.email,
          contact: form.phone
        },
        theme: {
          color: '#0077B6'
        },
        modal: {
          ondismiss: function () {
            setSubmitting(false);
          }
        }
      };
      
      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        alert('Razorpay SDK failed to load. Please verify your connection.');
        setSubmitting(false);
      }
    } catch (err) {
      console.error('Payment initiation error:', err);
      alert('Error connecting to payment server.');
      setSubmitting(false);
    }
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
              <p className="modal-email-note" style={{ color: '#16a34a', fontWeight: 600 }}>Payment confirmed automatically! Meeting link and details sent to your email.</p>
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
            <p className="modal-sub">Click the button below to pay ₹{webinar.fee_amount} securely online via Razorpay.</p>
            
            <div className="payment-box" style={{ background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: '12px', padding: '24px', textAlign: 'center', margin: '20px 0' }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 600 }}>Webinar Topic:</p>
              <h4 style={{ margin: '0 0 16px 0', color: 'var(--navy)' }}>{webinar.topic}</h4>
              <span style={{ background: '#e8f0fe', color: 'var(--blue)', padding: '8px 18px', borderRadius: '20px', fontSize: '1rem', fontWeight: 800 }}>
                💳 Total Amount: ₹{webinar.fee_amount}
              </span>
            </div>
            
            <button type="submit" className="btn-primary-lg modal-submit" disabled={submitting} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <CreditCard size={18} />
              {submitting ? 'Initiating Checkout...' : 'Pay Online with Razorpay'}
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
   12b. REGULATORY NOTICE BAR (Sticky Footer)
   ═══════════════════════════════════════════════ */
function RegulatoryNoticeBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isClosed = localStorage.getItem('scsl_notice_closed');
    if (isClosed !== 'true') {
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('scsl_notice_closed', 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <motion.div 
      className="regulatory-notice-bar"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ duration: 0.5, type: 'spring' }}
    >
      <div className="notice-bar-content">
        <div className="notice-bar-text">
          ⚠️ <strong>SEBI Regulatory Notice:</strong> Investment in securities market are subject to market risks, read all the related documents carefully before investing. | Steel City Securities Limited. SEBI Registration No: INZ000216330, Member: NSE & BSE, DP: CDSL, ISO 9001:2015 Certified.
        </div>
        <div className="notice-bar-links">
          <a href="#privacy" className="notice-bar-link">Privacy Policy</a>
          <a href="#disclaimer" className="notice-bar-link">Disclaimer</a>
          <a href="#investor-charter" className="notice-bar-link">Investor Charter</a>
        </div>
        <button className="notice-bar-close" onClick={handleClose} aria-label="Close Notice Banner">
          <X size={18} />
        </button>
      </div>
    </motion.div>
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
        <div className="footer-col"><h5>Quick Links</h5><ul><li><a href="#home">Home</a></li><li><a href="#news">Live News</a></li><li><a href="#webinars">Webinars</a></li><li><a href="#services">Services</a></li><li><a href="#journey">Journey</a></li><li><a href="#about">About Us</a></li><li><a href="#contact">Contact</a></li></ul></div>
        <div className="footer-col"><h5>Services</h5><ul><li><a href="#services">Stock Broking</a></li><li><a href="#services">e-Governance / PAN</a></li><li><a href="#services">Depository (DP)</a></li><li><a href="#services">NBFC Loans</a></li><li><a href="#services">NPS & Insurance</a></li></ul></div>
        <div className="footer-col"><h5>Contact</h5><ul><li>Steel City Heights, Vizag</li><li>+91 0891-2563581</li><li>scsl@steelcitynettrade.com</li><li>Mon–Sat: 09:00 – 18:00</li></ul></div>
      </div>
      <div className="footer-bottom container">
        <p>© 2026 Steel City Securities Limited. All rights reserved.</p>
        <div className="footer-bottom-links">
          <a href="#leads" className="admin-db-link">Admin Dashboard</a>
          <a href="#privacy">Privacy Policy</a>
          <a href="#disclaimer">Disclaimer</a>
          <a href="#investor-charter">Investor Charter</a>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════
   14. FLOATING CTA
   ═══════════════════════════════════════════════ */
function FloatingCTA({ page }) {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 3000); return () => clearTimeout(t); }, []);
  // Hide on admin, CRM, legal pages where it blocks forms
  const adminPages = ['leads', 'crm', 'privacy', 'disclaimer', 'investor-charter'];
  if (!show || adminPages.includes(page)) return null;
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
  useKeepAlive();
  const [page, setPage] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return ['home', 'news', 'market-search', 'webinars', 'services', 'hub', 'journey', 'about', 'contact', 'leads', 'crm', 'privacy', 'disclaimer', 'investor-charter'].includes(hash) ? hash : 'home';
  });

  const [cmsContent, setCmsContent] = useState({});
  const [fetchingCMS, setFetchingCMS] = useState(false);

  const fetchCMS = async () => {
    setFetchingCMS(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/homepage-content`);
      if (res.ok) {
        const data = await res.json();
        setCmsContent(data);
      }
    } catch (err) {
      console.error("Failed to fetch CMS content:", err);
    } finally {
      setFetchingCMS(false);
    }
  };

  useEffect(() => {
    fetchCMS();
  }, []);
  
  const [registeringWebinar, setRegisteringWebinar] = useState(null);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['home', 'news', 'market-search', 'webinars', 'services', 'hub', 'journey', 'about', 'contact', 'leads', 'crm', 'privacy', 'disclaimer', 'investor-charter'].includes(hash)) {
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
            <Hero cmsContent={cmsContent} onOpenAccountClick={() => setShowOpenAccount(true)} />
            <TrustStatsBar cmsContent={cmsContent} />
            <WhyWebinars cmsContent={cmsContent} />
            <Services limit={3} cmsContent={cmsContent} />
            <Testimonials />
            <FeedbackSection />
          </>
        )}
        {page === 'news' && <LiveNews isFullPage={true} />}
        {page === 'market-search' && <MarketSearchDashboard />}
        {page === 'webinars' && <WebinarSchedule onRegisterClick={setRegisteringWebinar} />}
        {page === 'services' && <Services cmsContent={cmsContent} />}
        {page === 'hub' && <ServicesHub />}
        {page === 'journey' && <Journey />}
        {page === 'about' && <About cmsContent={cmsContent} />}
        {page === 'contact' && <Contact cmsContent={cmsContent} />}
        {page === 'leads' && <LeadsAdminPage cmsContent={cmsContent} onCMSUpdate={fetchCMS} />}
        {page === 'crm' && <CRMClientPage />}
        {page === 'privacy' && <PrivacyPolicy onBackClick={() => { window.location.hash = ''; setPage('home'); }} />}
        {page === 'disclaimer' && <Disclaimer onBackClick={() => { window.location.hash = ''; setPage('home'); }} />}
        {page === 'investor-charter' && <InvestorCharter onBackClick={() => { window.location.hash = ''; setPage('home'); }} />}
      </main>
      <Footer />
      <FloatingCTA page={page} />
      
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
      <RegulatoryNoticeBar />
    </>
  );
}
