import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '../components/layout/GlassCard';
import { Button } from '../components/ui/components';
import { useSearchParams } from 'react-router-dom';
import BackgroundScene from '../components/BackgroundScene';

/* Inline SVG icons */
const IconGitHub = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
);

const IconAlertCircle = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const err = searchParams.get('error');
    if (err === 'oauth_failed') setErrorMsg('GitHub authentication failed. Please try again.');
    if (err === 'no_email') setErrorMsg('We could not retrieve an email from your GitHub account.');
  }, [searchParams]);

  const handleGitHubLogin = () => {
    window.location.href = 'http://localhost:8000/api/auth/github/login';
  };

  return (
    <>
      <BackgroundScene />
      <div className="login-page">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <GlassCard className="login-card">
          <div className="login-icon">
            <IconGitHub />
          </div>

          <div className="login-text">
            <h1>Sign In</h1>
            <p>Welcome to Team Orchestrator. Authorize with GitHub to access your workspace.</p>
          </div>

          {errorMsg && (
            <div className="alert-error">
              <IconAlertCircle />
              <p>{errorMsg}</p>
            </div>
          )}

          <div className="login-divider">
            <Button
              className="btn-full"
              onClick={handleGitHubLogin}
            >
              <IconGitHub />
              Continue with GitHub
            </Button>
          </div>

          <p className="login-fine-print">
            By continuing, you agree to our Terms of Service and Privacy Policy. Private repos require explicit permission.
          </p>
        </GlassCard>
      </motion.div>
      </div>
    </>
  );
}
