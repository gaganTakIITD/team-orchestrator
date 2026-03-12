import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Button } from '../components/ui/components';
import BackgroundScene from '../components/BackgroundScene';
import { TiltCard } from '../components/ui/TiltCard';

/* ── Inline SVG Icons ── */
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

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.65, delay, ease: [0.25, 0.8, 0.25, 1] },
});

const stats = [
  { value: '50+', label: 'Commit Dimensions Analyzed' },
  { value: '6', label: 'LLM-Scored Metrics' },
  { value: '<2min', label: 'Full Repo Analysis' },
  { value: '100%', label: 'Privacy-First, Local AI' },
];

const features = [
  { icon: <IconGitBranch />, cls: '', title: 'Deep Commit Analysis', desc: 'LLM-driven evaluation of commit complexity, integrity, and true impact across your entire codebase history.' },
  { icon: <IconUsers />, cls: 'success', title: 'Peer Review Matrix', desc: 'Automated peer feedback assignments and team-wide skill trajectory mapping with growth coaching.' },
  { icon: <IconBarChart />, cls: 'warning', title: 'Natural Language Insights', desc: 'Ask questions about your repository in plain English. The AI answers with data-backed analysis.' },
  { icon: <IconShield />, cls: 'info', title: 'Spam Detection', desc: 'Intelligent flagging of trivial, copy-paste, and proxy commits to ensure contribution integrity.' },
  { icon: <IconZap />, cls: '', title: 'Skill Growth Tracking', desc: 'Track improvement trajectories across time periods. Identify improving, stable, and declining contributors.' },
  { icon: <IconEye />, cls: 'success', title: 'Accessible by Design', desc: 'Tri-theme support, color-blind friendly palette, keyboard navigation, and screen reader compatible.' },
];

export function LandingPage() {
  const navigate = useNavigate();
  const containerRef = useRef(null);

  // Scroll animations for the entire page
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <motion.div style={{ position: 'fixed', inset: 0, zIndex: 0, y: bgY }}>
        <BackgroundScene />
      </motion.div>

      <div className="landing">
        {/* ── Hero ── */}
        <motion.section className="hero" style={{ opacity: heroOpacity, scale: heroScale }} {...fadeUp(0)}>
          <div className="hero-badge">
            <IconZap />
            <span>AI Git Contribution Analyzer</span>
          </div>

          <h1>
            Know Who Really<br />
            <span className="accent">Built What</span>
          </h1>

          <p className="hero-subtitle">
            AI-powered contribution analysis and peer feedback coaching for hackathon teams.
            Deep insights into code quality, effort distribution, and team dynamics — all running locally on your machine.
          </p>

          <div className="hero-actions">
            <Button className="btn-lg" onClick={() => navigate('/login')}>
              <IconArrowRight /> Get Started
            </Button>
            <Button variant="secondary" className="btn-lg" onClick={() => window.open('https://github.com', '_blank')}>
              <IconBook /> Documentation
            </Button>
          </div>
        </motion.section>

        {/* ── Stats Strip ── */}
        <motion.div className="stats-strip" {...fadeUp(0.12)}>
          {stats.map((s, i) => (
            <TiltCard key={i} className="stat-strip-item">
              <div className="stat-strip-value">{s.value}</div>
              <div className="stat-strip-label">{s.label}</div>
            </TiltCard>
          ))}
        </motion.div>

        {/* ── Features Grid ── */}
        <motion.section className="features-section" {...fadeUp(0.22)} viewport={{ once: true, margin: "-100px" }} whileInView={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 40 }} transition={{ duration: 0.8 }}>
          <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-3)' }}>
            Everything You Need
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', maxWidth: 520, margin: '0 auto var(--space-12)', fontSize: 'var(--text-lg)', fontWeight: 300 }}>
            From commit analysis to peer coaching. One CLI command to deep insights.
          </p>

          <div className="features-grid">
            {features.map((f, idx) => (
              <TiltCard key={idx} className="feature-card">
                <div className={`feature-icon ${f.cls}`}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </TiltCard>
            ))}
          </div>
        </motion.section>

        {/* ── How It Works ── */}
        <motion.section className="how-section" viewport={{ once: true, margin: "-100px" }} whileInView={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 40 }} transition={{ duration: 0.8 }}>
          <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-12)' }}>
            How It Works
          </h2>
          <div className="steps-row">
            {[
              { step: '1', title: 'Initialize', desc: 'Run team-orchestrator init in your git repository.' },
              { step: '2', title: 'Analyze', desc: 'Run team-orchestrator analyze to score all commits with AI.' },
              { step: '3', title: 'Dashboard', desc: 'Start the server and open the dashboard to view insights.' },
            ].map((s, i) => (
              <TiltCard key={i} className="step-card">
                <div className="step-number">{s.step}</div>
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
              </TiltCard>
            ))}
          </div>
        </motion.section>

        {/* ── CTA ── */}
        <motion.section className="cta-section" viewport={{ once: true }} whileInView={{ opacity: 1, scale: 1 }} initial={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.6 }}>
          <h2>Ready to Analyze?</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-8)', fontSize: 'var(--text-lg)', fontWeight: 300 }}>
            Sign in with GitHub and start getting AI-powered contribution insights today.
          </p>
          <Button className="btn-lg" onClick={() => navigate('/login')}>
            <IconArrowRight /> Launch Dashboard
          </Button>
        </motion.section>
      </div>
    </div>
  );
}
