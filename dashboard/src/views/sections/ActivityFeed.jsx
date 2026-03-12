import React, { useMemo, useState } from 'react';
import { GlassCard } from '../../components/layout/GlassCard';
import { Badge } from '../../components/ui/components';
import { FilterSortBar } from '../../components/ui/FilterSortBar';
import { CommitDetailModal } from './CommitDetailModal';

const TYPE_VARIANTS = {
  feature: 'info', bugfix: 'success', refactor: 'warning',
  test: 'warning', docs: 'default', spam: 'danger', trivial: 'default', unknown: 'default',
};

const SORT_OPTIONS = {
  date_desc: { label: 'Newest first', key: 'date', dir: 'desc' },
  date_asc: { label: 'Oldest first', key: 'date', dir: 'asc' },
  score_desc: { label: 'Highest score', key: 'score', dir: 'desc' },
  score_asc: { label: 'Lowest score', key: 'score', dir: 'asc' },
  author_asc: { label: 'Author A–Z', key: 'author', dir: 'asc' },
  author_desc: { label: 'Author Z–A', key: 'author', dir: 'desc' },
};

function getCommitScore(c) {
  const s = c.llm_scores;
  if (!s || s.complexity == null) return null;
  return (s.complexity + s.integrity + s.impact) / 3;
}

export function ActivityFeed({ commits }) {
  const [sortKey, setSortKey] = useState('date_desc');
  const [search, setSearch] = useState('');
  const [filterAuthor, setFilterAuthor] = useState('');
  const [filterType, setFilterType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCommit, setSelectedCommit] = useState(null);

  const { filteredCommits, authorOptions, typeOptions } = useMemo(() => {
    if (!commits || commits.length === 0) return { filteredCommits: [], authorOptions: [], typeOptions: [] };

    const authors = [...new Set(commits.map(c => c.author_name || c.author?.name || 'Unknown'))].sort();
    const types = [...new Set(commits.map(c => c.commit_type || c.llm_scores?.type || 'unknown'))].sort();

    let result = [...commits];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        (c.subject || c.message?.subject || '').toLowerCase().includes(q) ||
        (c.author_name || c.author?.name || '').toLowerCase().includes(q) ||
        (c.short_hash || '').toLowerCase().includes(q)
      );
    }
    if (filterAuthor) {
      result = result.filter(c => (c.author_name || c.author?.name || 'Unknown') === filterAuthor);
    }
    if (filterType) {
      result = result.filter(c => (c.commit_type || c.llm_scores?.type || 'unknown') === filterType);
    }
    if (dateFrom) {
      result = result.filter(c => {
        const d = c.date || c.timestamps?.authored_date || '';
        return d >= dateFrom;
      });
    }
    if (dateTo) {
      result = result.filter(c => {
        const d = c.date || c.timestamps?.authored_date || '';
        return d.substring(0, 10) <= dateTo;
      });
    }

    const opt = SORT_OPTIONS[sortKey] || SORT_OPTIONS.date_desc;
    result.sort((a, b) => {
      if (opt.key === 'date') {
        const da = a.date || a.timestamps?.authored_date || '';
        const db = b.date || b.timestamps?.authored_date || '';
        return opt.dir === 'desc' ? db.localeCompare(da) : da.localeCompare(db);
      }
      if (opt.key === 'score') {
        const sa = getCommitScore(a) ?? 0;
        const sb = getCommitScore(b) ?? 0;
        return opt.dir === 'desc' ? sb - sa : sa - sb;
      }
      if (opt.key === 'author') {
        const aa = a.author_name || a.author?.name || 'Unknown';
        const ab = b.author_name || b.author?.name || 'Unknown';
        return opt.dir === 'asc' ? aa.localeCompare(ab) : ab.localeCompare(aa);
      }
      return 0;
    });

    return { filteredCommits: result.slice(0, 30), authorOptions: authors, typeOptions: types };
  }, [commits, search, filterAuthor, filterType, dateFrom, dateTo, sortKey]);

  if (!commits || commits.length === 0) return null;

  return (
    <section className="space-y-6">
      <h3 className="section-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        Recent Activity
      </h3>

      <div className="filter-sort-bar-wrapper">
        <FilterSortBar
          sortKey={sortKey}
          onSortChange={setSortKey}
          sortOptions={SORT_OPTIONS}
          filterOptions={{ author: authorOptions, type: typeOptions }}
          filterValues={{ author: filterAuthor, type: filterType }}
          onFilterChange={(key, val) => {
            if (key === 'author') setFilterAuthor(val);
            if (key === 'type') setFilterType(val);
          }}
          searchPlaceholder="Search commits..."
          searchValue={search}
          onSearchChange={setSearch}
        />
        <div className="filter-date-range">
          <input type="date" className="input input-sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="From" />
          <span>–</span>
          <input type="date" className="input input-sm" value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="To" />
        </div>
      </div>

      <GlassCard className="card-flush">
        <div className="activity-feed">
          {filteredCommits.map((c, i) => {
            const date = c.date || c.timestamps?.authored_date || '';
            const commitType = c.commit_type || c.llm_scores?.type || 'unknown';
            const isSpam = c.is_spam || c.spam_check?.is_spam;
            const score = getCommitScore(c);
            const hasFeedback = c.coaching_feedback && Object.keys(c.coaching_feedback).length > 0;

            return (
              <div
                key={c.short_hash || i}
                className={`activity-item activity-item-clickable ${hasFeedback ? 'has-feedback' : ''}`}
                onClick={() => setSelectedCommit(c)}
              >
                <div className="activity-dot-col">
                  <div className={`activity-dot ${isSpam ? 'spam' : ''}`} />
                  {i < filteredCommits.length - 1 && <div className="activity-line" />}
                </div>
                <div className="activity-content">
                  <div className="activity-header">
                    <span className="activity-author">{c.author_name || 'Unknown'}</span>
                    <Badge variant={TYPE_VARIANTS[commitType] || 'default'}>{commitType}</Badge>
                    {score != null && <span className="activity-score">{score.toFixed(1)}/5</span>}
                    {isSpam && <Badge variant="danger">spam</Badge>}
                    {hasFeedback && <span className="activity-feedback-badge" title="Has AI feedback">💬</span>}
                  </div>
                  <div className="activity-subject">{c.subject || c.message?.subject || 'No message'}</div>
                  <div className="activity-meta">
                    <span className="activity-hash">{c.short_hash || '???'}</span>
                    {date && <span>{new Date(date).toLocaleDateString()}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {selectedCommit && (
        <CommitDetailModal commit={selectedCommit} onClose={() => setSelectedCommit(null)} />
      )}
    </section>
  );
}
