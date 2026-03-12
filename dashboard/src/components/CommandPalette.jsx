import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const ACTIONS = [
  { id: 'dashboard', label: 'Go to Dashboard', category: 'Navigation', path: '/dashboard' },
  { id: 'profile', label: 'Profile & Settings', category: 'Navigation', path: '/dashboard/profile' },
  { id: 'select-repos', label: 'Manage Repositories', category: 'Navigation', path: '/dashboard/select-repos' },
  { id: 'theme-dark', label: 'Switch to Dark Theme', category: 'Theme', action: 'theme:dark' },
  { id: 'theme-light', label: 'Switch to Light Theme', category: 'Theme', action: 'theme:light' },
  { id: 'theme-comfort', label: 'Switch to Comfort Theme', category: 'Theme', action: 'theme:comfort' },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { projects, setSelectedProject, authUser } = useAppContext();

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
        setQuery('');
        setSelectedIdx(0);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const allItems = useMemo(() => {
    const items = [...ACTIONS];
    (projects || []).forEach(p => {
      items.push({
        id: `project:${p.project_id}`,
        label: p.name,
        category: 'Projects',
        projectData: p,
      });
    });
    return items;
  }, [projects]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allItems;
    const q = query.toLowerCase();
    return allItems.filter(item =>
      item.label.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
    );
  }, [allItems, query]);

  useEffect(() => { setSelectedIdx(0); }, [query]);

  const executeItem = (item) => {
    setOpen(false);
    setQuery('');
    if (item.path) {
      navigate(item.path);
    } else if (item.action?.startsWith('theme:')) {
      const theme = item.action.split(':')[1];
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('team-orchestrator-theme', theme);
    } else if (item.projectData) {
      setSelectedProject(item.projectData);
      navigate('/dashboard');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIdx]) {
      executeItem(filtered[selectedIdx]);
    }
  };

  if (!authUser || !open) return null;

  return (
    <div className="cmd-overlay" onClick={() => setOpen(false)}>
      <div className="cmd-panel" onClick={e => e.stopPropagation()}>
        <div className="cmd-input-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cmd-search-icon">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            className="cmd-input"
            placeholder="Search actions, projects..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="cmd-kbd">ESC</kbd>
        </div>
        <div className="cmd-results">
          {filtered.length === 0 ? (
            <div className="cmd-empty">No results for "{query}"</div>
          ) : (
            filtered.map((item, i) => (
              <button
                key={item.id}
                className={`cmd-item ${i === selectedIdx ? 'cmd-item-active' : ''}`}
                onClick={() => executeItem(item)}
                onMouseEnter={() => setSelectedIdx(i)}
              >
                <span className="cmd-item-label">{item.label}</span>
                <span className="cmd-item-category">{item.category}</span>
              </button>
            ))
          )}
        </div>
        <div className="cmd-footer">
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>↵</kbd> select</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
