import React from 'react';

const TYPE_VARIANTS = {
  feature: 'info', bugfix: 'success', refactor: 'warning',
  test: 'warning', docs: 'default', spam: 'danger', trivial: 'default', unknown: 'default',
};

export function CommitDetailModal({ commit, onClose }) {
  if (!commit) return null;

  const scores = commit.llm_scores || {};
  const coaching = commit.coaching_feedback || {};
  const avgScore = scores.complexity != null && scores.integrity != null && scores.impact != null
    ? ((scores.complexity + scores.integrity + scores.impact) / 3).toFixed(2)
    : null;
  const commitType = commit.commit_type || scores.type || 'unknown';
  const isSpam = commit.is_spam || commit.spam_check?.is_spam;

  const feedbackParts = [];
  if (coaching.strengths?.length) feedbackParts.push({ label: 'Strengths', text: coaching.strengths.join('; ') });
  if (coaching.improvements?.length) feedbackParts.push({ label: 'Areas to improve', text: coaching.improvements.join('; ') });
  if (coaching.learning_tip) feedbackParts.push({ label: 'Learning tip', text: coaching.learning_tip });
  if (coaching.example_improved_message) feedbackParts.push({ label: 'Suggested commit message', text: `"${coaching.example_improved_message}"` });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Commit Details</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body commit-detail-body">
          <div className="commit-detail-header">
            <div className="commit-detail-subject">{commit.subject || commit.message?.subject || 'No message'}</div>
            <div className="commit-detail-meta">
              <span className="commit-detail-hash">{commit.short_hash || '???'}</span>
              <span>{commit.author_name || commit.author?.name || 'Unknown'}</span>
              <span>{commit.date ? new Date(commit.date).toLocaleString() : ''}</span>
              <span className={`badge badge-sm ${TYPE_VARIANTS[commitType] || 'default'}`}>{commitType}</span>
              {isSpam && <span className="badge badge-sm badge-danger">spam</span>}
            </div>
          </div>

          <div className="commit-detail-scores">
            <h4>Score Breakdown</h4>
            <div className="commit-detail-score-grid">
              <div className="commit-detail-score-item">
                <span className="score-label">Complexity</span>
                <span className="score-value">{scores.complexity ?? '—'}/5</span>
              </div>
              <div className="commit-detail-score-item">
                <span className="score-label">Integrity</span>
                <span className="score-value">{scores.integrity ?? '—'}/5</span>
              </div>
              <div className="commit-detail-score-item">
                <span className="score-label">Impact</span>
                <span className="score-value">{scores.impact ?? '—'}/5</span>
              </div>
              {avgScore && (
                <div className="commit-detail-score-item highlight">
                  <span className="score-label">Average</span>
                  <span className="score-value">{avgScore}/5</span>
                </div>
              )}
            </div>
          </div>

          {(feedbackParts.length > 0 || Object.keys(coaching).length > 0) && (
            <div className="commit-detail-feedback">
              <h4>AI Feedback Summary</h4>
              <div className="commit-detail-feedback-paragraph">
                {feedbackParts.length > 0 ? (
                  feedbackParts.map((p, i) => (
                    <p key={i}><strong>{p.label}:</strong> {p.text}</p>
                  ))
                ) : (
                  <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                    No detailed feedback for this commit. Scores meet the quality threshold.
                  </p>
                )}
              </div>
              {coaching.priority && (
                <div className="commit-detail-priority">
                  <span className="badge badge-sm badge-warning">Priority: {coaching.priority}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
