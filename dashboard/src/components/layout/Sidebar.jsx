import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { GlassCard } from './GlassCard';
import { Button } from '../ui/components';

/* ─── Inline SVG Icons ─── */
const IconActivity = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
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
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const IconEye = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconLogout = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const IconSettings = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

const ChevronDown = () => (
  <svg className="select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export function Sidebar() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showAllRepos, setShowAllRepos] = React.useState(false);
  const {
    currentRole,
    projects,
    selectedProject, setSelectedProject,
    status,
    authUser, logout,
  } = useAppContext();

  const { theme, setTheme } = useTheme();

  const statusClass = status
    ? `status-pill status-${status.status}`
    : 'status-pill';

  return (
    <nav className="sidebar" role="navigation" aria-label="Main navigation">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <IconActivity />
        </div>
        <div className="sidebar-logo-text">
          <h1>Team</h1>
          <span className="subtitle">Orchestrator</span>
        </div>
      </div>

      <div className="sidebar-body">
        {/* Theme Toggle */}
        <div>
          <label className="label">Theme</label>
          <div className="theme-toggle">
            <button
              className={`theme-toggle-btn ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => setTheme('dark')}
              title="Dark Onyx"
              aria-label="Switch to dark theme"
            >
              <IconMoon />
            </button>
            <button
              className={`theme-toggle-btn ${theme === 'light' ? 'active' : ''}`}
              onClick={() => setTheme('light')}
              title="Light Mist"
              aria-label="Switch to light theme"
            >
              <IconSun />
            </button>
            <button
              className={`theme-toggle-btn ${theme === 'comfort' ? 'active' : ''}`}
              onClick={() => setTheme('comfort')}
              title="Comfort Sepia"
              aria-label="Switch to comfort theme"
            >
              <IconEye />
            </button>
          </div>
        </div>

        {/* User Email Display (Read-only) */}
        <div style={{ padding: 'var(--space-3)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <label className="label" style={{ marginBottom: 'var(--space-2)' }}>Your Linked Email</label>
          <div
            className="input"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: 'var(--color-surface-hover)',
              color: 'var(--color-text-primary)',
              opacity: 0.8,
              cursor: 'not-allowed',
              userSelect: 'none'
            }}
          >
            {authUser?.email || 'Not authenticated'}
          </div>
          
          <button
            className="btn btn-ghost btn-full"
            style={{ marginTop: 'var(--space-2)', fontSize: '12px', justifyContent: 'flex-start' }}
            onClick={() => navigate('/dashboard/profile')}
          >
            <IconSettings />
            Profile & Permissions
          </button>
        </div>
        
        <hr className="sidebar-divider" />

        <hr className="sidebar-divider" />

        {/* Project Selector & Search */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="flex-between" style={{ marginBottom: 'var(--space-2)', flexShrink: 0 }}>
            <label className="label" style={{ marginBottom: 0 }}>Your Repositories</label>
            {projects && projects.length > 0 && (
              <button 
                onClick={() => setShowAllRepos(!showAllRepos)}
                style={{ 
                  fontSize: '10px', 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--color-accent)', 
                  cursor: 'pointer',
                  fontWeight: 600,
                  padding: '2px 4px',
                  borderRadius: '4px'
                }}
              >
                {showAllRepos ? 'Show Active' : 'Show All'}
              </button>
            )}
          </div>

          {projects && projects.length > 0 && (
            <div style={{ marginBottom: 'var(--space-3)', flexShrink: 0 }}>
              <input 
                type="text" 
                className="input" 
                placeholder="Find a repository..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', fontSize: '13px', padding: '8px 12px' }}
              />
            </div>
          )}

          {projects && projects.length > 0 ? (
            <div className="project-list" style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
              {projects
                .filter(p => showAllRepos || p.is_setup !== false)
                .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((p) => (
                <button
                  key={p.project_id}
                  className={`project-item ${selectedProject?.project_id === p.project_id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedProject(p);
                    navigate('/dashboard'); // Take them back to dashboard when they select a project
                  }}
                >
                  <div className="flex-between" style={{ gap: '8px', marginBottom: '2px', width: '100%', overflow: 'hidden' }}>
                    <div className="project-item-name" style={{ flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
                      {p.name}
                    </div>
                    {p.is_setup === false && (
                      <span style={{ 
                        fontSize: '9px', 
                        background: 'rgba(255, 150, 0, 0.2)', 
                        color: '#ffb020', 
                        padding: '2px 6px', 
                        borderRadius: '4px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}>Pending Config</span>
                    )}
                  </div>
                  <div className="project-item-meta" style={{ textAlign: 'left' }}>
                    {p.commit_count || 0} commits analyzed
                  </div>
                  
                  {/* Supervisor Details: Show all contributors */}
                  {currentRole === 'Admin' && p.authors && p.authors.length > 0 && (
                    <div style={{
                      marginTop: 'var(--space-2)',
                      fontSize: '11px',
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.4
                    }}>
                      <strong>Contributors:</strong> {p.authors.join(', ')}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-muted)',
              fontStyle: 'italic',
              padding: 'var(--space-4)',
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              textAlign: 'center',
            }}>
              {currentRole === 'User' && !authUser?.email ? 'Enter email to view' : 'No projects found'}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <label className="label">System Status</label>
        {status ? (
          <div className={statusClass}>
            <div className="status-dot" />
            <div>
              <div className="status-label">{status.status}</div>
              {(status.step || status.message) && (
                <div className="status-detail">
                  {status.step || status.message} {status.progress}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="status-pill">
            <div className="status-dot" />
            <div>Offline / Polling...</div>
          </div>
        )}

        {/* Logout button */}
        {authUser && (
          <button
            className="btn btn-ghost btn-full"
            style={{ marginTop: 'var(--space-3)' }}
            onClick={logout}
          >
            <IconLogout />
            Sign Out
          </button>
        )}
      </div>
    </nav>
  );
}
