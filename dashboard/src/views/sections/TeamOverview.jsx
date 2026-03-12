import React, { useMemo } from 'react';
import { GlassCard } from '../../components/layout/GlassCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';

const tooltipStyle = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '10px',
  color: 'var(--color-text-primary)',
};

export function TeamOverview({ vectors, commits }) {
  if (!vectors || vectors.length === 0) return null;

  const teamTypesData = useMemo(() => {
    return vectors.map(v => {
      const data = { name: v.name };
      if (v.commit_breakdown) {
        Object.entries(v.commit_breakdown).forEach(([type, count]) => {
          if (count > 0) data[type] = count;
        });
      }
      return data;
    });
  }, [vectors]);

  const allTypes = useMemo(() => {
    const types = new Set();
    teamTypesData.forEach(d => {
      Object.keys(d).forEach(k => {
        if (k !== 'name') types.add(k);
      });
    });
    return Array.from(types);
  }, [teamTypesData]);

  const TYPE_COLORS = {
    feature: '#3B82F6',
    bugfix: '#22C55E',
    refactor: '#06B6D4',
    test: '#F59E0B',
    docs: '#8B5CF6',
    spam: '#EF4444',
    trivial: '#94A3B8',
  };

  const timelineData = useMemo(() => {
    if (!commits || commits.length === 0) return { data: [], authors: [] };

    const grouped = {};
    const authorsSet = new Set();

    commits.forEach(c => {
      const dateRaw = c.date || (c.timestamps && c.timestamps.authored_date);
      if (!dateRaw) return;
      const dateStr = dateRaw.substring(0, 10);
      const author = c.author_name || (c.author && c.author.name) || 'Unknown';
      if (!grouped[dateStr]) grouped[dateStr] = {};
      if (!grouped[dateStr][author]) grouped[dateStr][author] = 0;
      grouped[dateStr][author] += 1;
      authorsSet.add(author);
    });

    const authors = Array.from(authorsSet);
    const sortedDates = Object.keys(grouped).sort();

    return {
      data: sortedDates.map(date => ({ date, ...grouped[date] })),
      authors,
    };
  }, [commits]);

  const AUTHOR_COLORS = ['#3B82F6', '#22C55E', '#F59E0B', '#06B6D4', '#EF4444', '#8B5CF6', '#F97316', '#14B8A6'];

  return (
    <section className="space-y-6">
      <h3 className="section-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        Team Overview
      </h3>

      <div className="grid-2col">
        <GlassCard style={{ padding: 'var(--space-6)' }}>
          <div className="section-subheader">Commit Types by Member</div>
          {allTypes.length > 0 ? (
            <div className="chart-holder" style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamTypesData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="var(--chart-grid)" tick={{ fill: 'var(--color-text-primary)', fontSize: 12 }} />
                  <YAxis stroke="var(--chart-grid)" tick={{ fill: 'var(--chart-text)', fontSize: 12 }} />
                  <Tooltip cursor={{ fill: 'var(--color-surface-hover)' }} contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  {allTypes.map(type => (
                    <Bar key={type} dataKey={type} stackId="a" fill={TYPE_COLORS[type] || '#94A3B8'} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-center" style={{ height: 320, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No commit types available</div>
          )}
        </GlassCard>

        <GlassCard style={{ padding: 'var(--space-6)' }}>
          <div className="section-subheader">Activity Timeline</div>
          {timelineData.data && timelineData.data.length > 0 ? (
            <div className="chart-holder" style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData.data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <XAxis dataKey="date" stroke="var(--chart-grid)" tick={{ fill: 'var(--color-text-primary)', fontSize: 12 }}
                    tickFormatter={(str) => str.substring(5)}
                  />
                  <YAxis stroke="var(--chart-grid)" tick={{ fill: 'var(--chart-text)', fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  {timelineData.authors.map((author, idx) => (
                    <Line
                      key={author}
                      type="monotone"
                      dataKey={author}
                      stroke={AUTHOR_COLORS[idx % AUTHOR_COLORS.length]}
                      strokeWidth={2.5}
                      dot={{ r: 3.5, fill: AUTHOR_COLORS[idx % AUTHOR_COLORS.length], strokeWidth: 0 }}
                      activeDot={{ r: 5.5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-center" style={{ height: 320, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No timeline data available</div>
          )}
        </GlassCard>
      </div>
    </section>
  );
}
