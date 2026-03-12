import React, { useState, useMemo } from 'react';
import { GlassCard } from '../../components/layout/GlassCard';
import { FeedbackThread } from '../../components/layout/FeedbackThread';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const tooltipStyle = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '10px',
  color: 'var(--color-text-primary)',
};

export function FeedbackCoach({ vectors, peerMatrix, forceUserEmail }) {
  if (!vectors || vectors.length === 0) return null;

  const initialUser = forceUserEmail
    ? vectors.find(v => v.email === forceUserEmail)
    : vectors[0];
  const [selectedName, setSelectedName] = useState(initialUser?.name || vectors[0]?.name);

  const selectedV = useMemo(() => vectors.find(v => v.name === selectedName) || vectors[0], [vectors, selectedName]);

  const visiblePeerMatrix = useMemo(() => {
    if (!peerMatrix) return [];
    if (!forceUserEmail || !selectedV) return peerMatrix;
    return peerMatrix.filter(
      p => p.reviewer === selectedV.name || p.reviewee === selectedV.name
    );
  }, [peerMatrix, forceUserEmail, selectedV]);

  if (!selectedV) return null;

  const coaching = selectedV.coaching_summary || {};
  const growth = selectedV.skill_growth || {};

  return (
    <section className="space-y-6">
      <div className="flex-between">
        <h3 className="section-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          {forceUserEmail ? 'My Coaching' : 'Feedback Coach'}
        </h3>

        {!forceUserEmail && (
          <div className="select-wrap">
            <select value={selectedName} onChange={(e) => setSelectedName(e.target.value)}>
              {vectors.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
            </select>
            <svg className="select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        )}
      </div>

      <div className="grid-2col">
        <GlassCard className="chart-card-inner">
          <div className="section-subheader" style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Top Strengths
          </div>
          {coaching.top_strengths && coaching.top_strengths.length > 0 ? (
            <ul className="coach-list">
              {coaching.top_strengths.map((str, i) => (
                <li key={i}><span className="coach-dot success" /><span>{str}</span></li>
              ))}
            </ul>
          ) : (
            <div style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: 'var(--text-sm)' }}>No strengths data available</div>
          )}
        </GlassCard>

        <GlassCard className="chart-card-inner">
          <div className="section-subheader" style={{ color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Areas for Improvement
          </div>
          {coaching.top_improvements && coaching.top_improvements.length > 0 ? (
            <ul className="coach-list">
              {coaching.top_improvements.map((imp, i) => (
                <li key={i}><span className="coach-dot warning" /><span>{imp}</span></li>
              ))}
            </ul>
          ) : (
            <div style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: 'var(--text-sm)' }}>No improvement data available</div>
          )}
        </GlassCard>
      </div>

      <div className="grid-2col">
        {growth.trend && growth.trend !== 'insufficient_data' && (
          <GlassCard className="chart-card-inner">
            <div className="section-subheader">Skill Growth Trajectory</div>
            <div className="growth-summary">
              <div style={{ flex: 1 }}>
                <div className="growth-label">{growth.trend}</div>
                <div className="growth-detail">Growth Rate: {((growth.growth_rate || 0) * 100).toFixed(1)}%</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 'var(--text-sm)' }}>
                <div style={{ color: 'var(--color-text-secondary)' }}>H1: <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{growth.first_half_avg?.toFixed(2)}</span></div>
                <div style={{ color: 'var(--color-text-secondary)' }}>H2: <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{growth.second_half_avg?.toFixed(2)}</span></div>
              </div>
            </div>
            <div className="chart-holder" style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { period: 'First Half', score: growth.first_half_avg },
                  { period: 'Second Half', score: growth.second_half_avg },
                ]} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                  <XAxis dataKey="period" stroke="var(--chart-grid)" tick={{ fill: 'var(--color-text-primary)', fontSize: 12 }} />
                  <YAxis domain={[0, 5]} stroke="var(--chart-grid)" tick={{ fill: 'var(--chart-text)', fontSize: 12 }} />
                  <Tooltip cursor={{ fill: 'var(--color-surface-hover)' }} contentStyle={tooltipStyle} />
                  <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                    <Cell fill="#3B82F6" />
                    <Cell fill={growth.trend === 'improving' ? '#22C55E' : growth.trend === 'declining' ? '#EF4444' : '#06B6D4'} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        )}

        {visiblePeerMatrix && visiblePeerMatrix.length > 0 && (
          <GlassCard className="card-flush">
            <div style={{ padding: 'var(--space-4) var(--space-5)' }}>
              <div className="section-subheader" style={{ marginBottom: 0 }}>Peer Review Matrix</div>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Reviewer</th>
                    <th>Reviewee</th>
                    <th>Focus Area</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePeerMatrix.map((peer, i) => (
                    <tr key={i}>
                      <td className="td-primary">{peer.reviewer}</td>
                      <td>{peer.reviewee}</td>
                      <td><span className="badge badge-info">{peer.focus_area}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}
      </div>

      <FeedbackThread targetEmail={selectedV.email} targetName={selectedV.name} />
    </section>
  );
}
