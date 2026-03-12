import React, { useMemo } from 'react';
import { GlassCard } from '../../components/layout/GlassCard';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';

const tooltipStyle = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '10px',
  color: 'var(--color-text-primary)',
};

export function Analytics({ insights, commits }) {
  const sentimentData = useMemo(() => {
    if (!commits || commits.length === 0) return [];

    const counts = { positive: 0, neutral: 0, negative: 0, mixed: 0 };
    commits.forEach(c => {
      const tone = c.sentiment?.tone;
      if (counts[tone] !== undefined) counts[tone]++;
      else if (tone) counts[tone] = 1;
    });

    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [commits]);

  const SENTIMENT_COLORS = {
    Positive: '#22C55E',
    Neutral: '#3B82F6',
    Negative: '#EF4444',
    Mixed: '#F59E0B',
  };

  const confidenceData = useMemo(() => {
    if (!commits || commits.length === 0) return [];
    const bins = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
    const histogram = bins.slice(0, -1).map((min, i) => ({
      range: `${min.toFixed(1)}-${bins[i + 1].toFixed(1)}`,
      count: 0,
    }));

    commits.forEach(c => {
      const conf = c.llm_scores?.confidence;
      if (typeof conf === 'number') {
        const binIndex = Math.min(Math.floor(conf / 0.2), 4);
        histogram[binIndex].count++;
      }
    });

    return histogram;
  }, [commits]);

  if (!commits || commits.length === 0) return null;

  return (
    <section className="space-y-6">
      <h3 className="section-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
        Analytics
      </h3>

      <div className="grid-2col">
        <GlassCard style={{ padding: 'var(--space-6)' }}>
          <div className="section-subheader">Commit Sentiment</div>
          {sentimentData.length > 0 ? (
            <div className="chart-holder" style={{ height: 256 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sentimentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {sentimentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SENTIMENT_COLORS[entry.name] || '#3B82F6'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: 'var(--color-text-primary)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-center" style={{ flex: 1, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No sentiment data available</div>
          )}
        </GlassCard>

        <GlassCard style={{ padding: 'var(--space-6)' }}>
          <div className="section-subheader">AI Confidence Distribution</div>
          {confidenceData.some(d => d.count > 0) ? (
            <div className="chart-holder" style={{ height: 256 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={confidenceData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                  <XAxis dataKey="range" stroke="var(--chart-grid)" tick={{ fill: 'var(--color-text-primary)', fontSize: 13 }} />
                  <YAxis stroke="var(--chart-grid)" tick={{ fill: 'var(--chart-text)', fontSize: 12 }} />
                  <Tooltip cursor={{ fill: 'var(--color-surface-hover)' }} contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-center" style={{ flex: 1, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No confidence data available</div>
          )}
        </GlassCard>
      </div>

      {insights && (
        <GlassCard style={{ padding: 'var(--space-8)' }}>
          <div className="section-subheader" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <svg style={{ width: 16, height: 16, color: 'var(--color-text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            Macro Team Insights
          </div>

          <div className="grid-3col" style={{ marginBottom: 'var(--space-8)' }}>
            <div className="insight-box">
              <div className="insight-label">Strongest Dimension</div>
              <div className="insight-value" style={{ color: 'var(--color-success)' }}>{insights.team_strongest_dimension || 'N/A'}</div>
            </div>
            <div className="insight-box">
              <div className="insight-label">Weakest Dimension</div>
              <div className="insight-value" style={{ color: 'var(--color-danger)' }}>{insights.team_weakest_dimension || 'N/A'}</div>
            </div>
            <div className="insight-box">
              <div className="insight-label">Team Spam Rate</div>
              <div className="insight-value" style={{ color: 'var(--color-warning)' }}>{((insights.team_spam_rate || 0) * 100).toFixed(1)}%</div>
            </div>
          </div>

          {insights.recommendation && (
            <div className="recommendation-box">
              <div className="recommendation-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </div>
              <div>
                <h5>Recommendation</h5>
                <p>{insights.recommendation}</p>
              </div>
            </div>
          )}
        </GlassCard>
      )}
    </section>
  );
}
