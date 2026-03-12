import React, { useMemo } from 'react';
import { GlassCard } from '../../components/layout/GlassCard';

function HealthRing({ score, label, color, size = 80 }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 5) * circumference;

  return (
    <div className="health-ring-wrapper">
      <svg width={size} height={size} className="health-ring-svg">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-border)" strokeWidth="5" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="health-ring-label">
        <div className="health-ring-value" style={{ color }}>{score.toFixed(1)}</div>
        <div className="health-ring-text">{label}</div>
      </div>
    </div>
  );
}

export function TeamHealth({ vectors, insights }) {
  const metrics = useMemo(() => {
    if (!vectors || vectors.length === 0) return null;
    const avgComplexity = vectors.reduce((a, v) => a + (v.average_scores?.complexity || 0), 0) / vectors.length;
    const avgIntegrity = vectors.reduce((a, v) => a + (v.average_scores?.integrity || 0), 0) / vectors.length;
    const avgImpact = vectors.reduce((a, v) => a + (v.average_scores?.impact || 0), 0) / vectors.length;
    const avgComposite = vectors.reduce((a, v) => a + (v.composite_score || 0), 0) / vectors.length;
    const totalSpam = vectors.reduce((a, v) => a + (v.quality_flags?.spam_commits || 0), 0);
    const totalCommits = vectors.reduce((a, v) => a + (v.total_commits || 0), 0);
    const spamRate = totalCommits > 0 ? totalSpam / totalCommits : 0;
    const healthScore = Math.max(0, Math.min(5, avgComposite * (1 - spamRate)));

    return { avgComplexity, avgIntegrity, avgImpact, avgComposite, spamRate, healthScore, totalSpam, totalCommits };
  }, [vectors]);

  if (!metrics) return null;

  const healthColor = metrics.healthScore >= 4 ? 'var(--color-success)' : metrics.healthScore >= 3 ? 'var(--color-accent)' : metrics.healthScore >= 2 ? 'var(--color-warning)' : 'var(--color-danger)';

  return (
    <section className="space-y-6">
      <h3 className="section-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
        Team Health
      </h3>

      <div className="grid-4col">
        <GlassCard className="health-card">
          <HealthRing score={metrics.healthScore} label="Health" color={healthColor} size={90} />
        </GlassCard>
        <GlassCard className="health-card">
          <HealthRing score={metrics.avgComplexity} label="Complexity" color="var(--color-accent)" />
        </GlassCard>
        <GlassCard className="health-card">
          <HealthRing score={metrics.avgIntegrity} label="Integrity" color="var(--color-info)" />
        </GlassCard>
        <GlassCard className="health-card">
          <HealthRing score={metrics.avgImpact} label="Impact" color="var(--color-success)" />
        </GlassCard>
      </div>

      <div className="grid-3col">
        <GlassCard className="stat-card">
          <div className="stat-value accent">{vectors.length}</div>
          <div className="stat-label">Contributors</div>
        </GlassCard>
        <GlassCard className="stat-card">
          <div className="stat-value success">{metrics.totalCommits}</div>
          <div className="stat-label">Total Commits</div>
        </GlassCard>
        <GlassCard className="stat-card">
          <div className="stat-value" style={{ color: metrics.spamRate > 0.1 ? 'var(--color-danger)' : 'var(--color-success)' }}>
            {(metrics.spamRate * 100).toFixed(1)}%
          </div>
          <div className="stat-label">Spam Rate</div>
        </GlassCard>
      </div>

      {insights?.recommendation && (
        <div className="recommendation-box">
          <div className="recommendation-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
          <div>
            <h5>AI Recommendation</h5>
            <p>{insights.recommendation}</p>
          </div>
        </div>
      )}
    </section>
  );
}
