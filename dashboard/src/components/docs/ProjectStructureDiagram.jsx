import React, { useState } from 'react';
import { FolderOpen, Folder, FileCode, ChevronRight, ChevronDown } from 'lucide-react';

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function TreeItem({ label, icon: Icon, children, isLast, depth = 0 }) {
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = children && children.length > 0;

  return (
    <div className="file-tree__item">
      <button
        type="button"
        className={`file-tree__row ${hasChildren ? 'file-tree__row--folder' : 'file-tree__row--file'}`}
        style={{ paddingLeft: `${12 + depth * 20}px` }}
        onClick={() => hasChildren && setOpen((o) => !o)}
      >
        <span className="file-tree__chevron">
          {hasChildren ? (open ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span className="file-tree__dot" />}
        </span>
        <Icon size={16} strokeWidth={2} />
        <span>{label}</span>
      </button>
      {hasChildren && open && (
        <div className="file-tree__children">
          {children.map((child, i) => (
            <TreeItem
              key={i}
              label={child.label}
              icon={child.icon}
              children={child.children}
              isLast={i === children.length - 1}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const structure = {
  label: 'team-orchestrator',
  icon: FolderOpen,
  children: [
    {
      label: 'api',
      icon: Folder,
      children: [
        { label: 'server.py', icon: FileCode },
        { label: 'routes.py', icon: FileCode },
        { label: 'auth.py', icon: FileCode },
      ],
    },
    {
      label: 'dashboard',
      icon: Folder,
      children: [
        { label: 'src/views/', icon: Folder },
        { label: 'src/components/', icon: Folder },
      ],
    },
    {
      label: 'src',
      icon: Folder,
      children: [
        { label: 'cli.py', icon: FileCode },
        { label: 'analyzer.py', icon: FileCode },
        { label: 'preprocessor.py', icon: FileCode },
      ],
    },
    { label: 'prompts', icon: Folder },
    { label: 'store', icon: Folder },
  ],
};

export function ProjectStructureDiagram() {
  return (
    <div className="structure-diagram file-tree" onClick={() => scrollToSection('project-structure')}>
      <div className="structure-diagram__label">Click folders to expand/collapse</div>
      <div className="file-tree__root">
        <TreeItem label={structure.label} icon={structure.icon} children={structure.children} depth={0} />
      </div>
    </div>
  );
}
