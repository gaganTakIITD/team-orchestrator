import React from 'react';
import { useAppContext } from '../context/AppContext';
import { GlassCard } from '../components/layout/GlassCard';

export function ProfileView() {
  const { authUser, projects } = useAppContext();

  if (!authUser) return null;

  const ownedRepos = projects.filter(p => p.registered_by?.email === authUser.email);
  const contributedRepos = projects.filter(p => p.registered_by?.email !== authUser.email);

  return (
    <div className="tab-pane active" style={{ padding: 'var(--space-6)', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        {authUser.avatar_url && (
          <img 
            src={authUser.avatar_url} 
            alt="Profile Avatar" 
            style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid var(--color-border)' }} 
          />
        )}
        <div>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: '600', marginBottom: 'var(--space-1)' }}>
            {authUser.name || authUser.login}
          </h2>
          <p style={{ color: 'var(--color-text-muted)' }}>{authUser.email}</p>
        </div>
      </div>

      <GlassCard title="Roles & Permissions">
        <div style={{ padding: 'var(--space-4)' }}>
          <p style={{ marginBottom: 'var(--space-4)', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
            Your access permissions are determined securely via GitHub OAuth.
            <br />
            <strong>Supervisor (Admin):</strong> You are automatically granted Supervisor rights to repositories you own.
            <br />
            <strong>Contributor (User):</strong> You are granted Contributor rights to repositories you have committed to.
          </p>
        </div>
      </GlassCard>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
        <GlassCard title="Supervisor Access">
          <div style={{ padding: 'var(--space-4)' }}>
            <h4 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
              Repositories you own
            </h4>
            {ownedRepos.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: '13px' }}>None</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '14px' }}>
                {ownedRepos.map(repo => (
                  <li key={repo.project_id} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--color-border)' }}>
                    <span>{repo.name}</span>
                    <span style={{ fontSize: '12px', color: repo.is_setup ? '#10b981' : '#ffb020' }}>
                      {repo.is_setup ? 'Active' : 'Pending Config'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </GlassCard>

        <GlassCard title="Contributor Access">
          <div style={{ padding: 'var(--space-4)' }}>
            <h4 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
              Repositories you contribute to
            </h4>
            {contributedRepos.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: '13px' }}>None</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '14px' }}>
                {contributedRepos.map(repo => (
                  <li key={repo.project_id} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--color-border)' }}>
                    <span>{repo.name}</span>
                    <span style={{ fontSize: '12px', color: repo.is_setup ? '#10b981' : '#ffb020' }}>
                      {repo.is_setup ? 'Active' : 'Pending LLM Config'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
