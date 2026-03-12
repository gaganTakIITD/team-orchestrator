import React, { useMemo } from 'react';
import { GlassCard } from '../../components/layout/GlassCard';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getIntensityClass(count, max) {
  if (count === 0) return 'heatmap-cell-0';
  const ratio = count / max;
  if (ratio < 0.25) return 'heatmap-cell-1';
  if (ratio < 0.5) return 'heatmap-cell-2';
  if (ratio < 0.75) return 'heatmap-cell-3';
  return 'heatmap-cell-4';
}

export function CommitHeatmap({ commits }) {
  const { weeks, maxCount, totalDays } = useMemo(() => {
    if (!commits || commits.length === 0) return { weeks: [], maxCount: 0, totalDays: 0 };

    const dayCounts = {};
    commits.forEach(c => {
      const dateRaw = c.date || c.timestamps?.authored_date;
      if (!dateRaw) return;
      const dateStr = dateRaw.substring(0, 10);
      dayCounts[dateStr] = (dayCounts[dateStr] || 0) + 1;
    });

    const dates = Object.keys(dayCounts).sort();
    if (dates.length === 0) return { weeks: [], maxCount: 0, totalDays: 0 };

    const start = new Date(dates[0]);
    const end = new Date(dates[dates.length - 1]);
    start.setDate(start.getDate() - start.getDay());

    const weeksArr = [];
    let current = new Date(start);
    let maxC = 0;
    let total = 0;

    while (current <= end || weeksArr.length < 12) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const key = current.toISOString().substring(0, 10);
        const count = dayCounts[key] || 0;
        if (count > maxC) maxC = count;
        if (count > 0) total++;
        week.push({ date: key, count, day: current.getDay() });
        current.setDate(current.getDate() + 1);
      }
      weeksArr.push(week);
      if (weeksArr.length > 52) break;
    }

    return { weeks: weeksArr, maxCount: maxC || 1, totalDays: total };
  }, [commits]);

  if (!commits || commits.length === 0) return null;

  return (
    <section className="space-y-6">
      <h3 className="section-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        Contribution Heatmap
      </h3>

      <GlassCard className="chart-card-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
          <div className="section-subheader" style={{ marginBottom: 0 }}>
            {commits.length} commits across {totalDays} active days
          </div>
        </div>

        <div className="heatmap-container">
          <div className="heatmap-day-labels">
            {DAYS.filter((_, i) => i % 2 === 1).map(d => (
              <div key={d} className="heatmap-day-label">{d}</div>
            ))}
          </div>
          <div className="heatmap-grid">
            {weeks.map((week, wi) => (
              <div key={wi} className="heatmap-week">
                {week.map((day, di) => (
                  <div
                    key={di}
                    className={`heatmap-cell ${getIntensityClass(day.count, maxCount)}`}
                    title={`${day.date}: ${day.count} commit${day.count !== 1 ? 's' : ''}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="heatmap-legend">
          <span className="heatmap-legend-label">Less</span>
          <div className="heatmap-cell heatmap-cell-0" />
          <div className="heatmap-cell heatmap-cell-1" />
          <div className="heatmap-cell heatmap-cell-2" />
          <div className="heatmap-cell heatmap-cell-3" />
          <div className="heatmap-cell heatmap-cell-4" />
          <span className="heatmap-legend-label">More</span>
        </div>
      </GlassCard>
    </section>
  );
}
