import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { GlassCard } from '../components/layout/GlassCard';
import { Button } from '../components/ui/components';

const IconLock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export function SelectReposPage() {
  const navigate = useNavigate();
  const { authUser, allGithubRepos, addRepos, selectedRepoNames } = useAppContext();
  const [selected, setSelected] = useState(new Set(selectedRepoNames || []));
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredRepos = useMemo(() => {
    return (allGithubRepos || []).filter(r =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.full_name || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [allGithubRepos, search]);

  const ownedRepos = useMemo(() => filteredRepos.filter(r => r.owner_login === authUser?.login), [filteredRepos, authUser]);
  const otherRepos = useMemo(() => filteredRepos.filter(r => r.owner_login !== authUser?.login), [filteredRepos, authUser]);

  const toggle = (name) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const selectAll = (repos) => {
    setSelected(prev => {
      const next = new Set(prev);
      repos.forEach(r => next.add(r.name));
      return next;
    });
  };

  const deselectAll = (repos) => {
    setSelected(prev => {
      const next = new Set(prev);
      repos.forEach(r => next.delete(r.name));
      return next;
    });
  };

  const handleContinue = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    const reposToAdd = allGithubRepos.filter(r => selected.has(r.name));
    await addRepos(reposToAdd);
    setSaving(false);
    navigate('/dashboard');
  };

  return (
    <div className="select-repos-page slide-up">
      <div className="select-repos-header">
        <h2>Select Your Repositories</h2>
        <p>Choose which repositories you want to track with Team Orchestrator. You can change this later from your profile.</p>
      </div>

      {allGithubRepos.length > 5 && (
        <div className="select-repos-search">
          <input
            type="text"
            className="input"
            placeholder="Search repositories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {ownedRepos.length > 0 && (
        <div className="select-repos-section">
          <div className="select-repos-section-header">
            <span className="select-repos-section-label">Your Repositories ({ownedRepos.length})</span>
            <div className="select-repos-section-actions">
              <button className="select-repos-link" onClick={() => selectAll(ownedRepos)}>Select all</button>
              <button className="select-repos-link" onClick={() => deselectAll(ownedRepos)}>Clear</button>
            </div>
          </div>
          <div className="select-repos-grid">
            {ownedRepos.map(repo => (
              <button
                key={repo.name}
                className={`select-repo-card ${selected.has(repo.name) ? 'selected' : ''}`}
                onClick={() => toggle(repo.name)}
              >
                <div className="select-repo-card-check">
                  {selected.has(repo.name) && <IconCheck />}
                </div>
                <div className="select-repo-card-body">
                  <div className="select-repo-card-name">
                    {repo.name}
                    {repo.private && <IconLock />}
                  </div>
                  {repo.description && (
                    <div className="select-repo-card-desc">{repo.description}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {otherRepos.length > 0 && (
        <div className="select-repos-section">
          <div className="select-repos-section-header">
            <span className="select-repos-section-label">Contributed To ({otherRepos.length})</span>
            <div className="select-repos-section-actions">
              <button className="select-repos-link" onClick={() => selectAll(otherRepos)}>Select all</button>
              <button className="select-repos-link" onClick={() => deselectAll(otherRepos)}>Clear</button>
            </div>
          </div>
          <div className="select-repos-grid">
            {otherRepos.map(repo => (
              <button
                key={repo.name}
                className={`select-repo-card ${selected.has(repo.name) ? 'selected' : ''}`}
                onClick={() => toggle(repo.name)}
              >
                <div className="select-repo-card-check">
                  {selected.has(repo.name) && <IconCheck />}
                </div>
                <div className="select-repo-card-body">
                  <div className="select-repo-card-name">
                    {repo.name}
                    {repo.private && <IconLock />}
                  </div>
                  <div className="select-repo-card-owner">{repo.owner_login}</div>
                  {repo.description && (
                    <div className="select-repo-card-desc">{repo.description}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="select-repos-footer">
        <div className="select-repos-footer-count">
          {selected.size} {selected.size === 1 ? 'repository' : 'repositories'} selected
        </div>
        <Button onClick={handleContinue} disabled={selected.size === 0 || saving} className="btn-lg">
          {saving ? 'Saving...' : `Continue with ${selected.size} repo${selected.size !== 1 ? 's' : ''}`}
        </Button>
      </div>
    </div>
  );
}
