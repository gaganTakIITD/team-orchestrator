import React, { useState } from 'react';
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
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export function Sidebar() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllRepos, setShowAllRepos] = useState(false);
  const {
    currentRole, projects,
    selectedProject, setSelectedProject,
    status, authUser, logout,
  } = useAppContext();
  const { theme, setTheme } = useTheme();

  const statusClass = status ? `status-pill status-${status.status}` : 'status-pill';

  const filteredProjects = (projects || [])
    .filter(p => showAllRepos || p.is_setup !== false)
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <nav className="sidebar" role="navigation" aria-label="Main navigation">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon"><IconActivity /></div>
        <div className="sidebar-logo-text">
          <h1>Team</h1>
          <span className="subtitle">Orchestrator</span>
        </div>
      </div>

      <div className="sidebar-body">
        <div className="sidebar-section">
          <div className="sidebar-section-label">Theme</div>
          <div className="theme-toggle">
            <button className={`theme-toggle-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')} title="Dark Onyx"><IconMoon /></button>
            <button className={`theme-toggle-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')} title="Light Mist"><IconSun /></button>
            <button className={`theme-toggle-btn ${theme === 'comfort' ? 'active' : ''}`} onClick={() => setTheme('comfort')} title="Comfort Sepia"><IconEye /></button>
          </div>
        </div>

        <div className="sidebar-user-box">
          <div className="sidebar-section-label">Account</div>
          <div className="sidebar-user-email">{authUser?.email || 'Not authenticated'}</div>
          <button className="sidebar-user-link" onClick={() => navigate('/dashboard/profile')}>
            <IconSettings />
            Profile & Permissions
          </button>
        </div>

        <hr className="sidebar-divider" />

        <div className="project-list-container">
          <div className="project-list-header">
            <div className="sidebar-section-label" style={{ marginBottom: 0 }}>Repositories</div>
            {projects && projects.length > 0 && (
              <button className="show-toggle-btn" onClick={() => setShowAllRepos(!showAllRepos)}>
                {showAllRepos ? 'Active Only' : 'Show All'}
              </button>
            )}
          </div>

          {projects && projects.length > 0 && (
            <div className="project-search">
              <input
                type="text"
                className="input"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}

          {filteredProjects.length > 0 ? (
            <div className="project-list">
              {filteredProjects.map((p) => (
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
                    {p.is_setup === false && <span className="project-pending-badge">Pending</span>}
                  </div>
                  <div className="project-item-meta">{p.commit_count || 0} commits</div>
                  {currentRole === 'Admin' && p.authors && p.authors.length > 0 && (
                    <div className="project-contributors">{p.authors.join(', ')}</div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="project-empty">
              {!projects || projects.length === 0 ? 'No projects found' : 'No matches'}
            </div>
          )}
        </div>
      </div>

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
            <div>Offline / Polling...</div>
          </div>
        )}

        {authUser && (
          <button className="btn btn-ghost btn-full btn-sm" style={{ marginTop: 'var(--space-2)' }} onClick={logout}>
            <IconLogout /> Sign Out
          </button>
        )}
      </div>
    </nav>
  );
}
