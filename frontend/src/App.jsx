import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, ShieldCheck, UserPlus, Globe, PhoneCall,
  ChevronRight, TrendingUp, Award, Mail, MapPin,
  Menu, X, ArrowRight, CheckCircle, Star,
  Landmark, Coins, PiggyBank, Calendar, Users, Video
} from 'lucide-react';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
  { label: 'Journey', href: '#journey' },
  { label: 'About Us', href: '#about' },
  { label: 'Contact', href: '#contact' },
];

function Navbar({ activePage }) {
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
          <a href="#contact" className="btn-solid">Open Account</a>
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
            <a href="#contact" className="btn-solid mobile-btn" onClick={() => setMenuOpen(false)}>Open Account</a>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/* ═══════════════════════════════════════════════
   3. HERO SECTION (HOME PAGE ONLY)
   ═══════════════════════════════════════════════ */
function Hero() {
  return (
    <section className="hero-section">
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="container hero-grid">
        <motion.div className="hero-text" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <div className="hero-badge"><span className="badge-dot" />Established 1995 · ISO 9001:2015 Certified</div>
          <h1 className="hero-title">All Financial<br /><span className="gradient-text">Services Under</span><br />One Roof</h1>
          <p className="hero-desc">Confidence as strong as steel. Steel City Securities Limited has served over <strong>4 Lakh+ investors</strong> for 31 years across <strong>420+ locations</strong> in India — with integrity, trust, and dedication.</p>
          <div className="hero-actions">
            <a href="#contact" className="btn-primary-lg">Open Trading Account <ChevronRight size={20} /></a>
            <a href="#webinars" className="btn-secondary-lg">Upcoming Webinars</a>
          </div>
          <div className="exchange-badges">
            {['NSE', 'BSE', 'MCX', 'NSDL', 'CDSL', 'NCDEX'].map(e => <span key={e} className="exch-badge">{e}</span>)}
          </div>
        </motion.div>
        <motion.div className="hero-visual" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, delay: 0.2 }}>
          <div className="ceo-float-card">
            <div className="ceo-img-wrap"><img src="/ceo.jpg" alt="Satish Kumar Arya – MD & CEO, SCSL" /></div>
            <div className="ceo-details">
              <p className="ceo-name">Satish Kumar Arya</p>
              <p className="ceo-title">Managing Director & CEO</p>
              <p className="ceo-quote">"Building wealth, building trust — for every Indian investor."</p>
            </div>
            <div className="stat-pill pill-1"><span className="pill-num">31+</span><span className="pill-lbl">Years Legacy</span></div>
            <div className="stat-pill pill-2"><span className="pill-num">4L+</span><span className="pill-lbl">Clients</span></div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   4. WEBINAR SCHEDULE PAGE
   ═══════════════════════════════════════════════ */
const upcomingWebinars = [
  { id: 1, trainer: 'Avadhut Sathe', region: 'Pan India', date: '30 May', day: 'Thursday', time: 'English | 6:00 PM to 9:00 PM', topic: 'Secrets of Smart Investing', mode: 'Online', seats: 250 },
  { id: 2, trainer: 'Rajesh Kutty', region: 'Middle East', date: '30 May', day: 'Thursday', time: 'English | 10:30 AM UAE Time (Gulf Time)', topic: 'F&O Masterclass', mode: 'Online', seats: 200 },
  { id: 3, trainer: 'Avadhut Sathe', region: 'Pan India', date: '31 May', day: 'Friday', time: 'Hindi | 6:00 PM to 9:00 PM', topic: 'Understanding Commodity Markets', mode: 'Online', seats: 300 },
  { id: 4, trainer: 'Vigneshwar DL', region: 'Pan India', date: '31 May', day: 'Friday', time: 'Tamil | 6:00 PM to 9:00 PM', topic: 'Sub-Broker Success Blueprint', mode: 'Online', seats: 150 },
];

function WebinarSchedule({ onRegisterClick }) {
  return (
    <section className="webinar-section section">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">Free Seminars & Webinars</span>
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
          {upcomingWebinars.map((w, i) => (
            <motion.div key={w.id} className="wtm-row" initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <div className="wtm-cell wtm-trainer">
                <img src="/host2.png" alt={w.trainer} className="trainer-avatar" />
                <div className="trainer-info">
                  <span className="t-name">{w.trainer}</span>
                  <span className="t-region">{w.region}</span>
                </div>
              </div>
              <div className="wtm-cell wtm-status">
                <span className="mode-badge online">{w.mode}</span>
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

function StatsBar() {
  return (
    <section className="stats-section">
      <div className="container stats-grid">
        <StatItem value={31}   suffix="+"  label="Years of Legacy"      icon={Award} />
        <StatItem value={420}  suffix="+"  label="Locations Pan India"  icon={MapPin} />
        <StatItem value={400}  suffix="K+" label="Active Clients"       icon={UserPlus} />
        <StatItem value={1600} suffix="+"  label="Terminal Licenses"    icon={BarChart3} />
        <StatItem value={22}   suffix=""   label="States (e-Governance)" icon={Globe} />
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
   11. LEADS ADMIN DASHBOARD PAGE
   ═══════════════════════════════════════════════ */
function LeadsAdminPage() {
  const [leads, setLeads] = useState({ contacts: [], registrations: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('contacts');

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/leads`);
      if (!res.ok) throw new Error('Failed to fetch data from API');
      const data = await res.json();
      setLeads(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Could not connect to backend server. Make sure the FastAPI backend is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleDelete = async (type, id) => {
    if (!window.confirm(`Are you sure you want to delete this ${type === 'contact' ? 'lead' : 'registration'}?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/leads/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id })
      });
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

  return (
    <section className="admin-section">
      <div className="container">
        <div className="admin-header">
          <div>
            <h1 className="admin-title">SCSL Admin Portal</h1>
            <p className="admin-subtitle">Monitor inquiries and webinar registrations stored in SQLite</p>
          </div>
          <button className="btn-solid refresh-btn" onClick={fetchLeads}>Refresh Data</button>
        </div>

        {error && (
          <div className="admin-error-banner">
            <p>⚠️ {error}</p>
          </div>
        )}

        <div className="admin-stats-grid">
          <div className="astat-card">
            <h4>Total Inquiries</h4>
            <div className="astat-val">{leads.contacts.length}</div>
            <p>Contact form submissions</p>
          </div>
          <div className="astat-card">
            <h4>Webinar Registrations</h4>
            <div className="astat-val">{leads.registrations.length}</div>
            <p>Seats booked across all topics</p>
          </div>
          <div className="astat-card">
            <h4>Total Records</h4>
            <div className="astat-val">{leads.contacts.length + leads.registrations.length}</div>
            <p>Persistent in SQLite database</p>
          </div>
        </div>

        <div className="admin-controls">
          <div className="admin-tabs">
            <button className={`admin-tab ${activeTab === 'contacts' ? 'active' : ''}`} onClick={() => setActiveTab('contacts')}>
              Contact Leads ({filteredContacts.length})
            </button>
            <button className={`admin-tab ${activeTab === 'registrations' ? 'active' : ''}`} onClick={() => setActiveTab('registrations')}>
              Webinar Registrations ({filteredRegs.length})
            </button>
          </div>
          <div className="admin-search-wrap">
            <input 
              type="text" 
              placeholder="Search by name, email, phone or message..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="admin-search-input"
            />
          </div>
        </div>

        {loading ? (
          <div className="admin-loader">Loading records from SQLite...</div>
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
        ) : (
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
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/register/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: form.phone })
      });
      if (res.ok) {
        setStep(2);
        alert('OTP sent successfully to your number! (For this demo, please use OTP: 1234)');
      } else {
        alert('Failed to send OTP. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to backend server.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
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
          otp: otp
        })
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json();
        alert(data.detail || 'Invalid OTP. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to backend server. Make sure backend is running.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <motion.div className="modal-content" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
        <button className="modal-close" onClick={onClose} aria-label="Close modal"><X size={20} /></button>
        {success ? (
          <div className="modal-success-state">
            <CheckCircle size={56} className="success-icon" />
            <h3>Seat Reserved Successfully!</h3>
            <p>You have registered for <strong>{webinar.topic}</strong>.</p>
            <p className="modal-date-info">📅 {webinar.date} at {webinar.time}</p>
            <p className="modal-email-note">Your contact details have been successfully verified.</p>
            <button className="btn-solid modal-done-btn" onClick={onClose}>Close Window</button>
          </div>
        ) : step === 1 ? (
          <form className="modal-form" onSubmit={handleRequestOtp}>
            <h3>Register for Webinar</h3>
            <p className="modal-sub">Secure your free seat for this live session.</p>
            <div className="modal-webinar-details">
              <p className="topic"><strong>Topic:</strong> {webinar.topic}</p>
              <p className="date"><strong>Schedule:</strong> {webinar.date} · {webinar.time}</p>
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
        ) : (
          <form className="modal-form" onSubmit={handleVerifyOtp}>
            <h3>OTP Verification</h3>
            <p className="modal-sub">An OTP has been sent to {form.phone}</p>
            <div className="mform-group">
              <label>Enter 4-Digit OTP *</label>
              <input type="text" maxLength="4" placeholder="1234" required value={otp} onChange={e => setOtp(e.target.value)} disabled={submitting} style={{ letterSpacing: '4px', fontSize: '1.2rem', textAlign: 'center' }} />
            </div>
            <button type="submit" className="btn-primary-lg modal-submit" disabled={submitting}>
              {submitting ? 'Verifying...' : 'Complete Registration'}
            </button>
            <button type="button" className="btn-secondary-lg w-full mt-2" onClick={() => setStep(1)} disabled={submitting}>Back</button>
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
    return ['home', 'webinars', 'services', 'journey', 'about', 'contact', 'leads'].includes(hash) ? hash : 'home';
  });
  
  const [registeringWebinar, setRegisteringWebinar] = useState(null);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['home', 'webinars', 'services', 'journey', 'about', 'contact', 'leads'].includes(hash)) {
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

  return (
    <>
      <MarketTicker />
      <Navbar activePage={page} />
      <main className="main-content">
        {page === 'home' && (
          <>
            <Hero />
            <StatsBar />
            <Services limit={3} />
            <Testimonials />
          </>
        )}
        {page === 'webinars' && <WebinarSchedule onRegisterClick={setRegisteringWebinar} />}
        {page === 'services' && <Services />}
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
      </AnimatePresence>
    </>
  );
}
