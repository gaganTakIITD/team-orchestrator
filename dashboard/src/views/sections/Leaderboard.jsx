import React, { useState, useMemo } from 'react';
import { GlassCard } from '../../components/layout/GlassCard';
import { Badge } from '../../components/ui/components';
import { FilterSortBar } from '../../components/ui/FilterSortBar';
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

const LEADERBOARD_SORT = {
  score_desc: { label: 'Highest score', key: 'score', dir: 'desc' },
  score_asc: { label: 'Lowest score', key: 'score', dir: 'asc' },
  name_asc: { label: 'Name A–Z', key: 'name', dir: 'asc' },
  name_desc: { label: 'Name Z–A', key: 'name', dir: 'desc' },
  commits_desc: { label: 'Most commits', key: 'commits', dir: 'desc' },
  grade_asc: { label: 'Grade (best first)', key: 'grade', dir: 'asc' },
};

const tooltipStyle = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '10px',
  color: 'var(--color-text-primary)',
};

function formatSummary(v) {
  const c = v.coaching_summary || {};
  const parts = [];
  if (c.top_strengths?.length) parts.push(`Strengths: ${c.top_strengths.slice(0, 2).join('; ')}`);
  if (c.top_improvements?.length) parts.push(`Improve: ${c.top_improvements.slice(0, 2).join('; ')}`);
  return parts.join('. ') || '—';
}

export function Leaderboard({ vectors }) {
  const [sortKey, setSortKey] = useState('score_desc');
  const [search, setSearch] = useState('');
  const [expandedEmail, setExpandedEmail] = useState(null);

  const sorted = useMemo(() => {
    if (!vectors || vectors.length === 0) return [];
    let list = [...vectors];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(v =>
        (v.name || '').toLowerCase().includes(q) ||
        (v.email || '').toLowerCase().includes(q)
      );
    }
    const opt = LEADERBOARD_SORT[sortKey] || LEADERBOARD_SORT.score_desc;
    const gradeOrder = { 'A+': 0, A: 1, 'B+': 2, B: 3, C: 4, D: 5 };
    list.sort((a, b) => {
      if (opt.key === 'score') return opt.dir === 'desc' ? (b.composite_score || 0) - (a.composite_score || 0) : (a.composite_score || 0) - (b.composite_score || 0);
      if (opt.key === 'name') return opt.dir === 'asc' ? (a.name || '').localeCompare(b.name || '') : (b.name || '').localeCompare(a.name || '');
      if (opt.key === 'commits') return opt.dir === 'desc' ? (b.total_commits || 0) - (a.total_commits || 0) : (a.total_commits || 0) - (b.total_commits || 0);
      if (opt.key === 'grade') return (gradeOrder[a.suggested_grade] ?? 99) - (gradeOrder[b.suggested_grade] ?? 99);
      return 0;
    });
    return list;
  }, [vectors, sortKey, search]);

  if (!vectors || vectors.length === 0) return null;

  return (
    <section className="space-y-6">
      <h3 className="section-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        Leaderboard
      </h3>

      <FilterSortBar
        sortKey={sortKey}
        onSortChange={setSortKey}
        sortOptions={LEADERBOARD_SORT}
        showFilters={false}
        searchPlaceholder="Search team members..."
        searchValue={search}
        onSearchChange={setSearch}
      />

      <GlassCard className="card-flush">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Score</th>
                <th>Grade</th>
                <th>Commits</th>
                <th>Spam %</th>
                <th>Feedback Summary</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((v, i) => {
                const isExpanded = expandedEmail === v.email;
                const summary = formatSummary(v);
                return (
                  <React.Fragment key={v.email}>
                    <tr
                      className={summary !== '—' ? 'leaderboard-row-clickable' : ''}
                      onClick={() => summary !== '—' && setExpandedEmail(isExpanded ? null : v.email)}
                    >
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
                      <td className="leaderboard-summary-cell" title={summary}>
                        {summary.length > 60 ? summary.slice(0, 60) + '…' : summary}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="leaderboard-expanded-row">
                        <td colSpan={7}>
                          <div className="leaderboard-feedback-paragraph">
                            <strong>Strengths:</strong> {(v.coaching_summary?.top_strengths || []).join('; ') || '—'}
                            <br />
                            <strong>Areas to improve:</strong> {(v.coaching_summary?.top_improvements || []).join('; ') || '—'}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <GlassCard className="chart-card-inner">
        <div className="section-subheader">Composite Scores</div>
        <div className="chart-holder" style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sorted} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
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
