import React from 'react';
import { useAppContext } from '../context/AppContext';
import { GlassCard } from '../components/layout/GlassCard';

export function AdminOverview() {
  const { projects } = useAppContext();

  if (!projects || projects.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 11H5m14 0a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2m14 0V9a2 2 0 0 0-2-2M5 11V9a2 2 0 0 1 2-2m0 0V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M7 7h10" />
          </svg>
        </div>
        <h3>No Projects Found</h3>
        <p>No projects registered. Use <code>team-orchestrator init</code> in a git repository to get started.</p>
      </div>
    );
  }

  return (
    <div className="slide-up">
      <div className="dashboard-header">
        <h2>All Projects</h2>
        <p>System-wide view of analyzed repositories</p>
      </div>

      <GlassCard className="card-flush" delay={0.1}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Authors</th>
                <th>Commits</th>
                <th>Last Analyzed</th>
                <th>Registered By</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.project_id}>
                  <td>
                    <div className="td-primary" style={{ fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.project_id}>
                      {p.project_id}
                    </div>
                  </td>
                  <td>{p.author_count || 0}</td>
                  <td>{p.commit_count || 0}</td>
                  <td>{p.last_analyzed ? new Date(p.last_analyzed).toLocaleString() : 'Never'}</td>
                  <td>
                    <div>{p.registered_by?.name || '\u2014'}</div>
                    {p.registered_by?.email && (
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{p.registered_by.email}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
