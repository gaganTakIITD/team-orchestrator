import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';

const IconActivity = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const IconMoon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const IconSun = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const IconEye = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);

const IconLogout = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const IconSettings = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const IconRefresh = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

function getRepoStatus(p) {
  if (p.is_setup === false) return { label: 'Not Set Up', cls: 'not-analyzed' };
  if (p.commit_count > 0 && p.author_count > 0) return { label: 'Scored', cls: 'scored' };
  if (p.commit_count > 0) return { label: 'Analyzed', cls: 'scored' };
  return { label: 'Pending', cls: 'pending' };
}

function getAvgScore(p) {
  if (!p.avg_score && !p.composite_avg) return null;
  return p.avg_score || p.composite_avg || null;
}

export function Sidebar() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllRepos, setShowAllRepos] = useState(false);
  const {
    currentRole, projects,
    selectedProject, setSelectedProject,
    status, authUser, logout,
    refreshProjects,
  } = useAppContext();
  const { theme, setTheme } = useTheme();

  const statusClass = status ? `status-pill status-${status.status}` : 'status-pill';

  const filteredProjects = useMemo(() => {
    return (projects || [])
      .filter(p => showAllRepos || p.is_setup !== false)
      .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [projects, showAllRepos, searchQuery]);

  const analyzedCount = useMemo(() => {
    return (projects || []).filter(p => p.is_setup !== false && p.commit_count > 0).length;
  }, [projects]);

  return (
    <nav className="sidebar" role="navigation" aria-label="Main navigation">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon"><IconActivity /></div>
        <div className="sidebar-logo-text">
          <h1>Team</h1>
          <span className="subtitle">Orchestrator</span>
        </div>
      </div>

      <div className="sidebar-body">
        {/* Account Section */}
        <div className="sidebar-user-box">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <div className="sidebar-section-label" style={{ marginBottom: 0 }}>Account</div>
            <span style={{ fontSize: '9px', fontWeight: 600, color: currentRole === 'Admin' ? 'var(--color-accent)' : 'var(--color-success)', background: currentRole === 'Admin' ? 'var(--color-accent-subtle)' : 'var(--color-success-subtle)', padding: '1px 6px', borderRadius: '4px' }}>
              {currentRole === 'Admin' ? 'Supervisor' : 'Contributor'}
            </span>
          </div>
          <div className="sidebar-user-email">{authUser?.email || 'Not authenticated'}</div>
          <button className="sidebar-user-link" onClick={() => navigate('/dashboard/profile')}>
            <IconSettings />
            Profile & Permissions
          </button>
        </div>

        {/* Theme */}
        <div className="sidebar-section">
          <div className="theme-toggle">
            <button className={`theme-toggle-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')} title="Dark"><IconMoon /></button>
            <button className={`theme-toggle-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')} title="Light"><IconSun /></button>
            <button className={`theme-toggle-btn ${theme === 'comfort' ? 'active' : ''}`} onClick={() => setTheme('comfort')} title="Sepia"><IconEye /></button>
          </div>
        </div>

        {/* Repositories - bounded scrollable container */}
        <div className="project-list-container">
          <div className="project-list-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div className="sidebar-section-label" style={{ marginBottom: 0 }}>Repos</div>
              {projects && projects.length > 0 && (
                <span className="project-count">{analyzedCount}/{projects.length}</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {refreshProjects && (
                <button className="show-toggle-btn" onClick={refreshProjects} title="Refresh repos">
                  <IconRefresh style={{ width: 10, height: 10 }} />
                </button>
              )}
              {projects && projects.length > 3 && (
                <button className="show-toggle-btn" onClick={() => setShowAllRepos(!showAllRepos)}>
                  {showAllRepos ? 'Active' : 'All'}
                </button>
              )}
            </div>
          </div>

          {projects && projects.length > 3 && (
            <div className="project-search">
              <input
                type="text"
                className="input"
                placeholder="Search repos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}

          {filteredProjects.length > 0 ? (
            <div className="project-list">
              {filteredProjects.map((p) => {
                const repoStatus = getRepoStatus(p);
                const avgScore = getAvgScore(p);
                return (
                  <button
                    key={p.project_id}
                    className={`project-item ${selectedProject?.project_id === p.project_id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedProject(p);
                      navigate('/dashboard');
                    }}
                  >
                    <div className="project-item-row">
                      <div className="project-item-name">{p.name}</div>
                      <span className={`project-status-badge ${repoStatus.cls}`}>
                        {repoStatus.label}
                      </span>
                    </div>
                    <div className="project-item-meta">
                      <span>{p.commit_count || 0} commits</span>
                      {p.author_count > 0 && <span>&middot; {p.author_count} authors</span>}
                      {avgScore && <span>&middot; {avgScore.toFixed(1)}/5</span>}
                    </div>
                    {avgScore && (
                      <div className="project-score-bar">
                        <div className="project-score-bar-fill" style={{ width: `${(avgScore / 5) * 100}%` }} />
                      </div>
                    )}
                    {p.last_analyzed && (
                      <div className="project-contributors">
                        Analyzed {new Date(p.last_analyzed).toLocaleDateString()}
                      </div>
                    )}
                    {!p.last_analyzed && currentRole === 'Admin' && p.authors && p.authors.length > 0 && (
                      <div className="project-contributors">{p.authors.join(', ')}</div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="project-empty">
              {!projects || projects.length === 0 ? 'No projects found' : 'No matches'}
            </div>
          )}
        </div>
      </div>

      {/* Footer - pinned at bottom */}
      <div className="sidebar-footer">
        <div className="sidebar-section-label">System</div>
        {status ? (
          <div className={statusClass}>
            <div className="status-dot" />
            <div>
              <div className="status-label">{status.status}</div>
              {(status.step || status.message) && (
                <div className="status-detail">{status.step || status.message} {status.progress}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="status-pill">
            <div className="status-dot" />
            <div>Offline</div>
          </div>
        )}

        {authUser && (
          <button className="btn btn-ghost btn-full btn-sm" style={{ marginTop: '6px' }} onClick={logout}>
            <IconLogout /> Sign Out
          </button>
        )}
      </div>
    </nav>
  );
}
