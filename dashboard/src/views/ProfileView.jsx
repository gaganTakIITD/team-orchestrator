import React from 'react';
import { useAppContext } from '../context/AppContext';
import { GlassCard } from '../components/layout/GlassCard';

export function ProfileView() {
  const { authUser, projects } = useAppContext();

  if (!authUser) return null;

  const ownedRepos = projects.filter(p => p.registered_by?.email === authUser.email);
  const contributedRepos = projects.filter(p => p.registered_by?.email !== authUser.email);

  return (
    <div className="profile-page slide-up">
      <div className="profile-header">
        {authUser.avatar_url && (
          <img src={authUser.avatar_url} alt="Profile" className="profile-avatar" />
        )}
        <div>
          <div className="profile-name">{authUser.name || authUser.login}</div>
          <div className="profile-email">{authUser.email}</div>
        </div>
      </div>

      <GlassCard title="Roles & Permissions" delay={0.05}>
        <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
          Permissions are assigned via GitHub OAuth.
          <br /><strong>Supervisor:</strong> Granted for repositories you own.
          <br /><strong>Contributor:</strong> Granted for repositories you have committed to.
        </p>
      </GlassCard>

      <div className="profile-grid">
        <GlassCard title="Supervisor Access" delay={0.1}>
          <div className="profile-section-title">Repositories you own</div>
          {ownedRepos.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: 'var(--text-sm)' }}>None</p>
          ) : (
            <ul className="profile-repo-list">
              {ownedRepos.map(repo => (
                <li key={repo.project_id} className="profile-repo-item">
                  <span>{repo.name}</span>
                  <span className={`profile-repo-status ${repo.is_setup ? 'active' : 'pending'}`}>
                    {repo.is_setup ? 'Active' : 'Pending'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard title="Contributor Access" delay={0.15}>
          <div className="profile-section-title">Repositories you contribute to</div>
          {contributedRepos.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: 'var(--text-sm)' }}>None</p>
          ) : (
            <ul className="profile-repo-list">
              {contributedRepos.map(repo => (
                <li key={repo.project_id} className="profile-repo-item">
                  <span>{repo.name}</span>
                  <span className={`profile-repo-status ${repo.is_setup ? 'active' : 'pending'}`}>
                    {repo.is_setup ? 'Active' : 'Pending'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
