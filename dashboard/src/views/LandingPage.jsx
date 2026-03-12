import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { Button } from '../components/ui/components';
import BackgroundScene from '../components/BackgroundScene';
import { TiltCard } from '../components/ui/TiltCard';

const IconArrowRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
);
const IconBook = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
);
const IconGitBranch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
);
const IconUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const IconBarChart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>
);
const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);
const IconZap = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
);
const IconEye = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
);
const IconMessageCircle = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
);
const IconTarget = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
);

function AnimatedCounter({ value, suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const numericValue = parseInt(value.replace(/[^0-9]/g, ''), 10) || 0;

  useEffect(() => {
    if (!isInView || numericValue === 0) return;
    let start = 0;
    const step = numericValue / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= numericValue) {
        setCount(numericValue);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, numericValue, duration]);

  const prefix = value.startsWith('<') ? '<' : value.startsWith('>') ? '>' : '';
  return <span ref={ref}>{prefix}{numericValue === 0 ? value : count}{suffix}</span>;
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  return (
    <motion.div
      className="scroll-progress"
      style={{ scaleX: scrollYProgress }}
    />
  );
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.8, 0.25, 1] } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.25, 0.8, 0.25, 1] } },
};

const stats = [
  { value: '50+', label: 'Commit Dimensions', suffix: '+' },
  { value: '6', label: 'LLM-Scored Metrics', suffix: '' },
  { value: '<2', label: 'Minutes Per Repo', suffix: 'min' },
  { value: '100', label: 'Privacy Score', suffix: '%' },
];

const features = [
  { icon: <IconGitBranch />, cls: '', title: 'Deep Commit Analysis', desc: 'LLM-driven evaluation of commit complexity, integrity, and true impact across your entire codebase.' },
  { icon: <IconUsers />, cls: 'success', title: 'Peer Review Matrix', desc: 'Automated peer feedback assignments and team-wide skill trajectory mapping with growth coaching.' },
  { icon: <IconBarChart />, cls: 'warning', title: 'Natural Language Insights', desc: 'Ask questions about your repository in plain English. The AI answers with data-backed analysis.' },
  { icon: <IconShield />, cls: 'info', title: 'Spam Detection', desc: 'Intelligent flagging of trivial, copy-paste, and proxy commits to ensure contribution integrity.' },
  { icon: <IconZap />, cls: '', title: 'Skill Growth Tracking', desc: 'Track improvement trajectories across time periods. Identify improving, stable, and declining contributors.' },
  { icon: <IconEye />, cls: 'success', title: 'Accessible by Design', desc: 'Tri-theme support, color-blind friendly palette, keyboard navigation, and screen reader compatible.' },
  { icon: <IconMessageCircle />, cls: 'info', title: 'Two-Way Feedback', desc: 'Supervisors leave feedback for contributors. Contributors reply. Real-time communication loop built in.' },
  { icon: <IconTarget />, cls: 'warning', title: 'Selective Repo Access', desc: 'Choose exactly which GitHub repos to track. Add or remove repos anytime from your profile.' },
  { icon: <IconBook />, cls: '', title: 'Export & Reports', desc: 'Download individual or team-wide JSON reports. Grade rubrics fully customizable to your course.' },
];

const techStack = [
  { name: 'FastAPI', role: 'Backend API' },
  { name: 'React', role: 'Frontend SPA' },
  { name: 'Three.js', role: '3D Visuals' },
  { name: 'Phi-3', role: 'Spam Detection' },
  { name: 'Llama 3.1', role: 'Deep Scoring' },
  { name: 'LangChain', role: 'Orchestration' },
  { name: 'SQLite', role: 'Data Store' },
  { name: 'JWT + OAuth', role: 'Auth & RBAC' },
];

const scoringDimensions = [
  { label: 'Complexity', weight: '35%', color: 'var(--color-accent)', desc: 'Whitespace to algorithm design' },
  { label: 'Impact', weight: '30%', color: 'var(--color-success)', desc: 'Critical vs. cosmetic changes' },
  { label: 'Integrity', weight: '25%', color: 'var(--color-info)', desc: 'Commit message quality' },
  { label: 'Effort Spread', weight: '10%', color: 'var(--color-warning)', desc: 'Consistency over time' },
];

export function LandingPage() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const bgRef = useRef(null);
  const [launching, setLaunching] = useState(false);

  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.96]);

  const handleLaunch = () => {
    if (launching) return;
    setLaunching(true);
    bgRef.current?.triggerWarp();
    setTimeout(() => navigate('/login'), 1100);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <ScrollProgress />
      <motion.div style={{ position: 'fixed', inset: 0, zIndex: 0, y: bgY }}>
        <BackgroundScene ref={bgRef} />
      </motion.div>

      {launching && (
        <motion.div
          className="warp-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        />
      )}

      <motion.div
        className="landing"
        animate={launching ? { scale: 1.3, opacity: 0, filter: 'blur(20px)' } : {}}
        transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Hero */}
        <motion.section className="hero" style={{ opacity: heroOpacity, scale: heroScale }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
            <div className="hero-badge">
              <IconZap />
              <span>AI-Powered Git Contribution Analyzer</span>
            </div>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.8, 0.25, 1] }}>
            Know Who Really<br />
            <span className="accent">Built What</span>
          </motion.h1>

          <motion.p className="hero-subtitle" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}>
            Privacy-first contribution analysis and peer feedback coaching.
            Deep insights into code quality, effort distribution, and team dynamics — all running locally on your machine.
          </motion.p>

          <motion.div className="hero-actions" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.55 }}>
            <Button className="btn-lg" onClick={handleLaunch}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>
              {launching ? 'Launching...' : 'Get Started Free'}
            </Button>
            <Button variant="secondary" className="btn-lg" onClick={() => window.open('https://github.com/team-orchestrator', '_blank')}>
              <IconBook /> Documentation
            </Button>
          </motion.div>

          <motion.div className="hero-trust" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
            <span>100% Offline</span>
            <span className="hero-trust-dot" />
            <span>No Data Leaves Your Machine</span>
            <span className="hero-trust-dot" />
            <span>Open Source</span>
          </motion.div>
        </motion.section>

        {/* Animated Stats */}
        <motion.div
          className="stats-strip"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {stats.map((s, i) => (
            <motion.div key={i} variants={fadeInUp}>
              <TiltCard className="stat-strip-item">
                <div className="stat-strip-value">
                  <AnimatedCounter value={s.value} suffix={s.suffix} />
                </div>
                <div className="stat-strip-label">{s.label}</div>
              </TiltCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Scoring Rubric */}
        <motion.section
          className="scoring-section"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          <motion.h2 variants={fadeInUp} style={{ textAlign: 'center', marginBottom: 'var(--space-3)' }}>
            Scientific Scoring Rubric
          </motion.h2>
          <motion.p variants={fadeInUp} style={{ textAlign: 'center', color: 'var(--color-text-secondary)', maxWidth: 520, margin: '0 auto var(--space-10)', fontSize: 'var(--text-lg)', fontWeight: 300 }}>
            Every commit is evaluated across 4 dimensions using local LLMs.
          </motion.p>
          <div className="scoring-grid">
            {scoringDimensions.map((d, i) => (
              <motion.div key={i} variants={scaleIn} className="scoring-card">
                <div className="scoring-card-weight" style={{ color: d.color }}>{d.weight}</div>
                <div className="scoring-card-label">{d.label}</div>
                <div className="scoring-card-desc">{d.desc}</div>
                <div className="scoring-card-bar">
                  <motion.div
                    className="scoring-card-bar-fill"
                    style={{ background: d.color }}
                    initial={{ width: 0 }}
                    whileInView={{ width: d.weight }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, delay: i * 0.15, ease: [0.25, 0.8, 0.25, 1] }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Features */}
        <motion.section
          className="features-section"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          <motion.h2 variants={fadeInUp} style={{ textAlign: 'center', marginBottom: 'var(--space-3)' }}>
            Everything You Need
          </motion.h2>
          <motion.p variants={fadeInUp} style={{ textAlign: 'center', color: 'var(--color-text-secondary)', maxWidth: 520, margin: '0 auto var(--space-12)', fontSize: 'var(--text-lg)', fontWeight: 300 }}>
            From commit analysis to peer coaching. One CLI command to deep insights.
          </motion.p>
          <div className="features-grid">
            {features.map((f, idx) => (
              <motion.div key={idx} variants={fadeInUp}>
                <TiltCard className="feature-card">
                  <div className={`feature-icon ${f.cls}`}>{f.icon}</div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* How It Works */}
        <motion.section
          className="how-section"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          <motion.h2 variants={fadeInUp} style={{ textAlign: 'center', marginBottom: 'var(--space-12)' }}>
            How It Works
          </motion.h2>
          <div className="steps-row">
            {[
              { step: '1', title: 'Initialize', desc: 'Run team-orchestrator init in your git repository to register it.' },
              { step: '2', title: 'Analyze', desc: 'Run team-orchestrator analyze — local AI scores every commit in minutes.' },
              { step: '3', title: 'Dashboard', desc: 'Open the web dashboard to view leaderboards, insights, and coaching.' },
            ].map((s, i) => (
              <motion.div key={i} variants={fadeInUp}>
                <TiltCard className="step-card">
                  <div className="step-number">{s.step}</div>
                  <h4>{s.title}</h4>
                  <p>{s.desc}</p>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Tech Stack */}
        <motion.section
          className="tech-section"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          <motion.h2 variants={fadeInUp} style={{ textAlign: 'center', marginBottom: 'var(--space-3)' }}>
            Built With
          </motion.h2>
          <motion.p variants={fadeInUp} style={{ textAlign: 'center', color: 'var(--color-text-secondary)', maxWidth: 480, margin: '0 auto var(--space-10)', fontSize: 'var(--text-lg)', fontWeight: 300 }}>
            Enterprise-grade open-source stack. No vendor lock-in.
          </motion.p>
          <div className="tech-grid">
            {techStack.map((t, i) => (
              <motion.div key={i} variants={scaleIn} className="tech-pill">
                <div className="tech-pill-name">{t.name}</div>
                <div className="tech-pill-role">{t.role}</div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Two-Portal Section */}
        <motion.section
          className="portals-section"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          <motion.h2 variants={fadeInUp} style={{ textAlign: 'center', marginBottom: 'var(--space-3)' }}>
            Two-Portal RBAC System
          </motion.h2>
          <motion.p variants={fadeInUp} style={{ textAlign: 'center', color: 'var(--color-text-secondary)', maxWidth: 560, margin: '0 auto var(--space-10)', fontSize: 'var(--text-lg)', fontWeight: 300 }}>
            GitHub OAuth automatically assigns your role based on repository ownership.
          </motion.p>
          <div className="portals-grid">
            <motion.div variants={fadeInUp} className="portal-card portal-supervisor">
              <div className="portal-card-badge">Supervisor</div>
              <h4>Repository Owners</h4>
              <ul>
                <li>Team Overview Dashboard</li>
                <li>Leaderboards & Analytics</li>
                <li>AI-Assisted Grading</li>
                <li>Direct Feedback to Students</li>
                <li>Export Reports & Data</li>
                <li>Commit Heatmaps</li>
              </ul>
            </motion.div>
            <motion.div variants={fadeInUp} className="portal-card portal-contributor">
              <div className="portal-card-badge">Contributor</div>
              <h4>Team Members</h4>
              <ul>
                <li>Personal Analytics Deep Dive</li>
                <li>Individual Score Breakdown</li>
                <li>AI Feedback Coach</li>
                <li>Skill Growth Tracking</li>
                <li>Peer Comparison Matrix</li>
                <li>Reply to Supervisor Feedback</li>
              </ul>
            </motion.div>
          </div>
        </motion.section>

        {/* CTA */}
        <motion.section
          className="cta-section"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2>Ready to Analyze?</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-8)', fontSize: 'var(--text-lg)', fontWeight: 300 }}>
            Sign in with GitHub and start getting AI-powered contribution insights today.
          </p>
          <Button className="btn-lg" onClick={handleLaunch}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>
            Launch Dashboard
          </Button>
        </motion.section>

        {/* Footer */}
        <footer className="landing-footer">
          <span>Team Orchestrator</span>
          <span className="hero-trust-dot" />
          <span>AI-Collab Hack 2025</span>
          <span className="hero-trust-dot" />
          <span>IIT Delhi x Imperial College London x Microsoft</span>
        </footer>
      </motion.div>
    </div>
  );
}
