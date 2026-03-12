import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { GlassCard } from '../components/layout/GlassCard';
import { Button } from '../components/ui/components';

const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconLock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export function ProfileView() {
  const navigate = useNavigate();
  const { authUser, projects, allGithubRepos, selectedRepoNames, addRepos, removeRepo, currentRole } = useAppContext();
  const [removing, setRemoving] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [addPending, setAddPending] = useState(new Set());
  const [addSaving, setAddSaving] = useState(false);

  if (!authUser) return null;

  const trackedRepos = projects || [];

  const availableToAdd = useMemo(() => {
    return (allGithubRepos || []).filter(r =>
      !selectedRepoNames?.has(r.name) &&
      r.name.toLowerCase().includes(addSearch.toLowerCase())
    );
  }, [allGithubRepos, selectedRepoNames, addSearch]);

  const handleRemove = async (repoName) => {
    setRemoving(repoName);
    await removeRepo(repoName);
    setRemoving(null);
  };

  const handleAddRepos = async () => {
    if (addPending.size === 0) return;
    setAddSaving(true);
    const reposToAdd = allGithubRepos.filter(r => addPending.has(r.name));
    await addRepos(reposToAdd);
    setAddSaving(false);
    setAddPending(new Set());
    setShowAddModal(false);
  };

  const toggleAddPending = (name) => {
    setAddPending(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="profile-page slide-up">
      <div className="profile-header">
        {authUser.avatar_url && (
          <img src={authUser.avatar_url} alt="Profile" className="profile-avatar" />
        )}
        <div>
          <div className="profile-name">{authUser.name || authUser.login}</div>
          <div className="profile-email">{authUser.email}</div>
          <div style={{ marginTop: '4px' }}>
            <span className={`badge ${currentRole === 'Admin' ? 'badge-info' : 'badge-success'}`}>
              {currentRole === 'Admin' ? 'Supervisor' : 'Contributor'}
            </span>
          </div>
        </div>
      </div>

      <GlassCard title="Roles & Permissions" delay={0.05}>
        <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
          <strong>Supervisor:</strong> Granted automatically for repos you own on GitHub.
          <br /><strong>Contributor:</strong> Granted for repos you have committed to.
          <br />Roles switch automatically when you select different repos in the sidebar.
        </p>
      </GlassCard>

      <GlassCard title="Manage Repositories" delay={0.1} style={{ marginTop: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <div className="profile-section-title" style={{ marginBottom: 0 }}>
            Tracked Repositories ({trackedRepos.length})
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button variant="secondary" className="btn-sm" onClick={() => setShowAddModal(true)}>
              <IconPlus /> Add Repos
            </Button>
            <Button variant="ghost" className="btn-sm" onClick={() => navigate('/dashboard/select-repos')}>
              Manage All
            </Button>
          </div>
        </div>

        {trackedRepos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>
            <p style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>No repositories tracked yet.</p>
            <Button onClick={() => navigate('/dashboard/select-repos')}>
              <IconPlus /> Select Repositories
            </Button>
          </div>
        ) : (
          <div className="profile-repo-managed-list">
            {trackedRepos.map(repo => (
              <div key={repo.project_id || repo.full_name || `${repo.owner_login || ''}/${repo.name}` || repo.name} className="profile-repo-managed-item">
                <div className="profile-repo-managed-info">
                  <div className="profile-repo-managed-name">{repo.name}</div>
                  <div className="profile-repo-managed-meta">
                    {repo.commit_count > 0 && <span>{repo.commit_count} commits</span>}
                    {repo.author_count > 0 && <span>{repo.author_count} authors</span>}
                    {repo.is_private && <IconLock />}
                    <span className={`badge badge-sm ${repo.is_setup !== false ? (repo.commit_count > 0 ? 'badge-success' : 'badge-warning') : 'badge-default'}`}>
                      {repo.is_setup !== false ? (repo.commit_count > 0 ? 'Scored' : 'Pending') : 'Not Set Up'}
                    </span>
                  </div>
                </div>
                <button
                  className="profile-repo-remove-btn"
                  onClick={() => handleRemove(repo.name)}
                  disabled={removing === repo.name}
                  title="Remove from tracking"
                >
                  {removing === repo.name ? '...' : <IconTrash />}
                </button>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Repositories</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <input
                type="text"
                className="input"
                placeholder="Search repos..."
                value={addSearch}
                onChange={(e) => setAddSearch(e.target.value)}
                style={{ marginBottom: 'var(--space-3)' }}
              />
              <div className="modal-repo-list">
                {availableToAdd.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                    {addSearch ? 'No matching repos' : 'All repos already tracked'}
                  </div>
                ) : (
                  availableToAdd.map(repo => (
                    <button
                      key={repo.full_name || `${repo.owner_login || ''}/${repo.name}` || repo.name}
                      className={`modal-repo-item ${addPending.has(repo.name) ? 'selected' : ''}`}
                      onClick={() => toggleAddPending(repo.name)}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{repo.name}</div>
                        {repo.description && <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{repo.description}</div>}
                      </div>
                      {repo.private && <IconLock />}
                    </button>
                  ))
                )}
              </div>
            </div>
            <div className="modal-footer">
              <Button variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button onClick={handleAddRepos} disabled={addPending.size === 0 || addSaving}>
                {addSaving ? 'Adding...' : `Add ${addPending.size} repo${addPending.size !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
