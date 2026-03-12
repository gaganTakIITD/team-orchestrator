import React, { useState, useMemo } from 'react';
import { GlassCard } from '../../components/layout/GlassCard';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ScatterChart, Scatter, ZAxis } from 'recharts';

const tooltipStyle = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '10px',
  color: 'var(--color-text-primary)',
};

const TYPE_COLORS = ['#3B82F6', '#22C55E', '#F59E0B', '#06B6D4', '#EF4444', '#8B5CF6'];

// Rubric: Complexity 35%, Integrity 25%, Impact 30%, Effort Spread 10%
const SCORE_DIMENSIONS = [
  { key: 'complexity', label: 'Complexity', weight: 35, desc: '1=whitespace only → 5=complex algorithm', color: '#3B82F6' },
  { key: 'integrity', label: 'Integrity', weight: 25, desc: '1=misleading message → 5=perfect match', color: '#22C55E' },
  { key: 'impact', label: 'Impact', weight: 30, desc: '1=no value → 5=critical contribution', color: '#F59E0B' },
  { key: 'effort_spread', label: 'Effort Spread', weight: 10, desc: 'Consistency over time (0–100%)', color: '#8B5CF6', scale: 5 },
];

export function DeepDive({ vectors, commits, forceUserEmail }) {
  if (!vectors || vectors.length === 0) return null;

  const initialUser = forceUserEmail
    ? vectors.find(v => v.email === forceUserEmail)
    : vectors[0];
  const [selectedName, setSelectedName] = useState(initialUser?.name || vectors[0]?.name);

  const selectedV = useMemo(() => vectors.find(v => v.name === selectedName) || vectors[0], [vectors, selectedName]);

  const scoreProfileData = useMemo(() => {
    if (!selectedV) return [];
    return SCORE_DIMENSIONS.map(d => {
      let value = 0;
      if (d.key === 'effort_spread') {
        value = (selectedV.effort_spread ?? 0) * 5;
      } else {
        value = selectedV.average_scores?.[d.key] || 0;
      }
      return { ...d, value: Math.min(5, Math.max(0, value)), fullMark: 5 };
    });
  }, [selectedV]);

  const radarData = useMemo(() => scoreProfileData, [scoreProfileData]);

  const typesData = useMemo(() => {
    if (!selectedV?.commit_breakdown) return [];
    return Object.entries(selectedV.commit_breakdown)
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => ({ type, count }));
  }, [selectedV]);

  const timelineData = useMemo(() => {
    if (!selectedV || !commits) return [];
    const personCommits = commits.filter(c =>
      c.author_email === selectedV.email || c.author?.name === selectedV.name
    );
    const dayMap = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7 };
    return personCommits.map(c => {
      const hour = c.timestamps?.hour_of_day || 0;
      const dayStr = c.timestamps?.day_of_week || 'Unknown';
      return { x: hour, y: dayMap[dayStr] || 0, dayStr, z: 1 };
    }).filter(p => p.y !== 0);
  }, [selectedV, commits]);

  if (!selectedV) return null;

  return (
    <section className="space-y-6">
      <div className="flex-between">
        <h3 className="section-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          {forceUserEmail ? 'My Performance' : 'Individual Deep Dive'}
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

      {/* Contributor stat cards */}
      {forceUserEmail && (
        <div className="grid-4col" style={{ marginBottom: 'var(--space-4)' }}>
          <GlassCard className="stat-card" delay={0}>
            <div className="stat-card-row">
              <div className="stat-icon accent" style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}>
                <span style={{ fontSize: 24 }}>{selectedV.suggested_grade || '—'}</span>
              </div>
              <div>
                <div className="stat-value accent">{selectedV.suggested_grade || '—'}</div>
                <div className="stat-label">Grade</div>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="stat-card" delay={0.05}>
            <div className="stat-card-row">
              <div className="stat-icon success" style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--color-success)' }}>
                <span style={{ fontSize: 20, fontWeight: 700 }}>{selectedV.composite_score?.toFixed(1) || '—'}</span>
              </div>
              <div>
                <div className="stat-value success">{selectedV.composite_score?.toFixed(1) || '—'}/5</div>
                <div className="stat-label">Composite Score</div>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="stat-card" delay={0.1}>
            <div className="stat-card-row">
              <div className="stat-icon info" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--color-info)' }}>
                <span style={{ fontSize: 20, fontWeight: 700 }}>{selectedV.total_commits || 0}</span>
              </div>
              <div>
                <div className="stat-value info">{selectedV.total_commits || 0}</div>
                <div className="stat-label">Commits</div>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="stat-card" delay={0.15}>
            <div className="stat-card-row">
              <div className="stat-icon" style={{ background: 'rgba(139,92,246,0.15)', color: '#8B5CF6' }}>
                <span style={{ fontSize: 18 }}>{((selectedV.effort_spread ?? 0) * 100).toFixed(0)}%</span>
              </div>
              <div>
                <div className="stat-value">{((selectedV.effort_spread ?? 0) * 100).toFixed(0)}%</div>
                <div className="stat-label">Effort Spread</div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* 4D Score Profile - redesigned */}
      <GlassCard className="chart-card-inner score-profile-card">
        <div className="section-subheader" style={{ marginBottom: 8 }}>4D Score Profile</div>
        <p className="score-profile-desc">Based on rubric: Complexity 35%, Integrity 25%, Impact 30%, Effort Spread 10%</p>
        <div className="score-profile-grid">
          {scoreProfileData.map((d, i) => (
            <div key={d.key} className="score-dimension">
              <div className="score-dimension-header">
                <span className="score-dimension-label">{d.label}</span>
                <span className="score-dimension-weight">{d.weight}%</span>
              </div>
              <div className="score-dimension-bar-wrap">
                <div
                  className="score-dimension-bar"
                  style={{
                    width: `${(d.value / 5) * 100}%`,
                    background: `linear-gradient(90deg, ${d.color}88, ${d.color})`,
                  }}
                />
              </div>
              <div className="score-dimension-value">{d.value.toFixed(1)}/5</div>
              <div className="score-dimension-desc">{d.desc}</div>
            </div>
          ))}
        </div>
        <div className="chart-holder" style={{ height: 280, marginTop: 24 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
              <PolarGrid stroke="var(--chart-grid)" strokeWidth={1.5} />
              <PolarAngleAxis
                dataKey="label"
                tick={{ fill: 'var(--color-text-primary)', fontSize: 12, fontWeight: 600 }}
              />
              <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fill: 'var(--chart-text)', fontSize: 11 }} />
              <Radar name={selectedV.name} dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.25} strokeWidth={2} />
              <Tooltip
                contentStyle={tooltipStyle}
                content={({ payload }) => {
                  if (payload?.[0]) {
                    const d = payload[0].payload;
                    return (
                      <div style={{ padding: '8px 12px', fontSize: 13 }}>
                        <strong>{d.label}</strong> ({d.weight}%): {d.value?.toFixed(1)}/5
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>{d.desc}</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      <div className="grid-2col">
        <GlassCard className="chart-card-inner">
          <div className="section-subheader">Commit Types</div>
          {typesData.length > 0 ? (
            <div className="chart-holder" style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typesData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 5 }}>
                  <XAxis type="number" stroke="var(--chart-grid)" tick={{ fill: 'var(--chart-text)' }} />
                  <YAxis dataKey="type" type="category" stroke="var(--chart-grid)" tick={{ fill: 'var(--color-text-primary)', fontSize: 12 }} width={70} />
                  <Tooltip cursor={{ fill: 'var(--color-surface-hover)' }} contentStyle={tooltipStyle} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {typesData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={TYPE_COLORS[index % TYPE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-center" style={{ height: 200, color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: 'var(--text-sm)' }}>No type data</div>
          )}
        </GlassCard>

        {selectedV.skill_growth && selectedV.skill_growth.trend !== 'insufficient_data' && (
          <GlassCard className="chart-card-inner">
            <div className="section-subheader">Skill Growth</div>
            <div className="growth-summary">
              <div style={{ flex: 1 }}>
                <div className="growth-label">{selectedV.skill_growth.trend}</div>
                <div className="growth-detail">Growth: {((selectedV.skill_growth.growth_rate || 0) * 100).toFixed(1)}%</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 'var(--text-sm)' }}>
                <div style={{ color: 'var(--color-text-secondary)' }}>H1: <span style={{ fontWeight: 600 }}>{selectedV.skill_growth.first_half_avg?.toFixed(2)}</span></div>
                <div style={{ color: 'var(--color-text-secondary)' }}>H2: <span style={{ fontWeight: 600 }}>{selectedV.skill_growth.second_half_avg?.toFixed(2)}</span></div>
              </div>
            </div>
          </GlassCard>
        )}
      </div>

      {selectedV.coaching_summary && (selectedV.coaching_summary.top_strengths?.length || selectedV.coaching_summary.top_improvements?.length) && (
        <GlassCard className="chart-card-inner">
          <div className="section-subheader">Your Feedback Summary</div>
          <div className="deep-dive-summary-paragraph">
            {selectedV.coaching_summary.top_strengths?.length > 0 && (
              <p><strong>Strengths:</strong> {selectedV.coaching_summary.top_strengths.join('. ')}</p>
            )}
            {selectedV.coaching_summary.top_improvements?.length > 0 && (
              <p><strong>Areas to improve:</strong> {selectedV.coaching_summary.top_improvements.join('. ')}</p>
            )}
          </div>
        </GlassCard>
      )}

      <GlassCard className="chart-card-inner">
        <div className="section-subheader">Quality Flags</div>
        <div className="flag-grid">
          <div className="flag-item">
            <div className="flag-label">Spam Rate</div>
            <div className="flag-value">{((selectedV.quality_flags?.spam_rate || 0) * 100).toFixed(1)}%</div>
          </div>
          <div className="flag-item">
            <div className="flag-label">Spam Commits</div>
            <div className="flag-value" style={{ color: 'var(--color-danger)' }}>{selectedV.quality_flags?.spam_commits || 0}</div>
          </div>
          <div className="flag-item">
            <div className="flag-label">Proxy Commits</div>
            <div className="flag-value" style={{ color: 'var(--color-warning)' }}>{selectedV.quality_flags?.proxy_commits || 0}</div>
          </div>
          <div className="flag-item">
            <div className="flag-label">Late Night</div>
            <div className="flag-value" style={{ color: 'var(--color-info)' }}>{selectedV.quality_flags?.late_night_commits || 0}</div>
          </div>
        </div>
      </GlassCard>

      {timelineData.length > 0 && (
        <GlassCard className="chart-card-inner">
          <div className="section-subheader">Commit Activity (Day × Hour)</div>
          <div className="chart-holder" style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <XAxis type="number" dataKey="x" name="Hour" domain={[0, 23]} stroke="var(--chart-grid)" tick={{ fill: 'var(--color-text-primary)', fontSize: 11 }} tickCount={12} />
                <YAxis type="number" dataKey="y" name="Day" domain={[1, 7]} stroke="var(--chart-grid)" tick={{ fill: 'var(--color-text-primary)', fontSize: 11 }}
                  tickFormatter={(val) => ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][val] || val} />
                <ZAxis type="number" dataKey="z" range={[80, 80]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3', stroke: 'var(--color-border-active)' }}
                  content={({ payload }) => {
                    if (payload && payload.length) {
                      return (
                        <div style={{ ...tooltipStyle, padding: '6px 10px', fontSize: '12px' }}>
                          {`${payload[0].payload.dayStr} at ${payload[0].value}:00`}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter name="Commits" data={timelineData} fill="#3B82F6" fillOpacity={0.7} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      )}
    </section>
  );
}
