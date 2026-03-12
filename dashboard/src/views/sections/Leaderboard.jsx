import React from 'react';
import { GlassCard } from '../../components/layout/GlassCard';
import { Badge } from '../../components/ui/components';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const GRADE_COLORS = {
  'A+': '#22C55E', A: '#22C55E',
  'B+': '#3B82F6', B: '#3B82F6',
  C: '#F59E0B', D: '#EF4444',
};

const GRADE_VARIANTS = {
  'A+': 'success', A: 'success',
  'B+': 'info', B: 'info',
  C: 'warning', D: 'danger',
};

const tooltipStyle = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '10px',
  color: 'var(--color-text-primary)',
};

export function Leaderboard({ vectors }) {
  if (!vectors || vectors.length === 0) return null;

  const sorted = [...vectors].sort((a, b) => b.composite_score - a.composite_score);

  return (
    <section className="space-y-6">
      <h3 className="section-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        Leaderboard
      </h3>

      <GlassCard className="card-flush">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Name</th>
                <th>Score</th>
                <th>Grade</th>
                <th>Commits</th>
                <th>Spam %</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((v, i) => (
                <tr key={v.email}>
                  <td className="td-primary" style={{ fontWeight: 700 }}>{i + 1}</td>
                  <td className="td-primary">{v.name}</td>
                  <td>{(v.composite_score || 0).toFixed(2)}</td>
                  <td>
                    <Badge variant={GRADE_VARIANTS[v.suggested_grade] || 'default'}>
                      {v.suggested_grade}
                    </Badge>
                  </td>
                  <td>{v.total_commits}</td>
                  <td style={{ color: 'var(--color-text-muted)' }}>
                    {((v.quality_flags?.spam_rate || 0) * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <GlassCard style={{ padding: 'var(--space-6)' }}>
        <div className="section-subheader">Composite Scores</div>
        <div className="chart-holder" style={{ height: 256 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sorted} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <XAxis dataKey="name" stroke="var(--chart-grid)" tick={{ fill: 'var(--chart-text)', fontSize: 12 }} />
              <YAxis domain={[0, 5]} stroke="var(--chart-grid)" tick={{ fill: 'var(--chart-text)', fontSize: 12 }} />
              <Tooltip cursor={{ fill: 'var(--color-surface-hover)' }} contentStyle={tooltipStyle} itemStyle={{ color: 'var(--color-text-primary)' }} />
              <Bar dataKey="composite_score" radius={[6, 6, 0, 0]}>
                {sorted.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={GRADE_COLORS[entry.suggested_grade] || '#3B82F6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>
    </section>
  );
}
