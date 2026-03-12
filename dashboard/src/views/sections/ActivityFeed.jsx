import React, { useMemo } from 'react';
import { GlassCard } from '../../components/layout/GlassCard';
import { Badge } from '../../components/ui/components';

const TYPE_VARIANTS = {
  feature: 'info', bugfix: 'success', refactor: 'warning',
  test: 'warning', docs: 'default', spam: 'danger', trivial: 'default', unknown: 'default',
};

export function ActivityFeed({ commits }) {
  const recentCommits = useMemo(() => {
    if (!commits || commits.length === 0) return [];
    return [...commits]
      .sort((a, b) => {
        const da = a.date || a.timestamps?.authored_date || '';
        const db = b.date || b.timestamps?.authored_date || '';
        return db.localeCompare(da);
      })
      .slice(0, 20);
  }, [commits]);

  if (recentCommits.length === 0) return null;

  return (
    <section className="space-y-6">
      <h3 className="section-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        Recent Activity
      </h3>

      <GlassCard className="card-flush">
        <div className="activity-feed">
          {recentCommits.map((c, i) => {
            const date = c.date || c.timestamps?.authored_date || '';
            const commitType = c.commit_type || c.llm_scores?.type || 'unknown';
            const isSpam = c.is_spam || c.spam_check?.is_spam;
            return (
              <div key={i} className="activity-item">
                <div className="activity-dot-col">
                  <div className={`activity-dot ${isSpam ? 'spam' : ''}`} />
                  {i < recentCommits.length - 1 && <div className="activity-line" />}
                </div>
                <div className="activity-content">
                  <div className="activity-header">
                    <span className="activity-author">{c.author_name || 'Unknown'}</span>
                    <Badge variant={TYPE_VARIANTS[commitType] || 'default'}>{commitType}</Badge>
                    {isSpam && <Badge variant="danger">spam</Badge>}
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
    </section>
  );
}
