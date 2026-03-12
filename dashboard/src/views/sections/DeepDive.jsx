import React, { useState, useMemo } from 'react';
import { GlassCard } from '../../components/layout/GlassCard';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ScatterChart, Scatter, ZAxis } from 'recharts';

const tooltipStyle = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '10px',
  color: 'var(--color-text-primary)',
};

export function DeepDive({ vectors, commits, forceUserEmail }) {
  if (!vectors || vectors.length === 0) return null;

  const initialUser = forceUserEmail 
    ? vectors.find(v => v.email === forceUserEmail) 
    : vectors[0];
  const [selectedName, setSelectedName] = useState(initialUser?.name || vectors[0]?.name);
  
  const selectedV = useMemo(() => vectors.find(v => v.name === selectedName) || vectors[0], [vectors, selectedName]);

  const radarData = useMemo(() => {
    if (!selectedV) return [];
    return [
      { subject: 'Complexity', A: selectedV.average_scores?.complexity || 0, fullMark: 5 },
      { subject: 'Integrity', A: selectedV.average_scores?.integrity || 0, fullMark: 5 },
      { subject: 'Impact', A: selectedV.average_scores?.impact || 0, fullMark: 5 },
    ];
  }, [selectedV]);

  const typesData = useMemo(() => {
    if (!selectedV?.commit_breakdown) return [];
    return Object.entries(selectedV.commit_breakdown)
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => ({ type, count }));
  }, [selectedV]);

  const TYPE_COLORS = ['#3B82F6', '#22C55E', '#F59E0B', '#06B6D4', '#EF4444', '#8B5CF6'];

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
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          Individual Deep Dive
        </h3>

        {/* HIDE Dropdown if we are forcing a user email (User Mode) */}
        {!forceUserEmail && (
          <div className="select-wrap">
            <select value={selectedName} onChange={(e) => setSelectedName(e.target.value)}>
              {vectors.map(v => (
                <option key={v.name} value={v.name}>{v.name}</option>
              ))}
            </select>
            <svg className="select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        )}
      </div>

      <div className="grid-2col">
        <GlassCard style={{ padding: 'var(--space-6)' }}>
          <div className="section-subheader">Score Profile</div>
          <div className="chart-holder" style={{ height: 288 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="var(--chart-grid)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--color-text-primary)', fontSize: 13 }} />
                <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fill: 'var(--chart-text)' }} />
                <Radar name={selectedV.name} dataKey="A" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                <Tooltip contentStyle={tooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard style={{ padding: 'var(--space-6)' }}>
          <div className="section-subheader">Commit Types</div>
          {typesData.length > 0 ? (
            <div className="chart-holder" style={{ height: 256 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typesData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 5 }}>
                  <XAxis type="number" stroke="var(--chart-grid)" tick={{ fill: 'var(--chart-text)' }} />
                  <YAxis dataKey="type" type="category" stroke="var(--chart-grid)" tick={{ fill: 'var(--color-text-primary)' }} width={80} />
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
            <div className="flex-center" style={{ flex: 1, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No type data</div>
          )}
        </GlassCard>
      </div>

      <GlassCard style={{ padding: 'var(--space-6)' }}>
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
        <GlassCard style={{ padding: 'var(--space-6)' }}>
          <div className="section-subheader">Commit Activity (Day x Hour)</div>
          <div className="chart-holder" style={{ height: 256 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <XAxis type="number" dataKey="x" name="Hour" domain={[0, 23]} stroke="var(--chart-grid)" tick={{ fill: 'var(--color-text-primary)' }} tickCount={12} />
                <YAxis type="number" dataKey="y" name="Day" domain={[1, 7]} stroke="var(--chart-grid)" tick={{ fill: 'var(--color-text-primary)' }}
                  tickFormatter={(val) => {
                    const days = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                    return days[val] || val;
                  }}
                />
                <ZAxis type="number" dataKey="z" range={[100, 100]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3', stroke: 'var(--color-border-active)' }}
                  content={({ payload }) => {
                    if (payload && payload.length) {
                      return (
                        <div style={{ ...tooltipStyle, padding: '8px 12px' }}>
                          <p style={{ color: 'var(--color-text-primary)' }}>{`${payload[0].payload.dayStr} at ${payload[0].value}:00`}</p>
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
