import React, { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

/**
 * Vertical left-aligned tree (no horizontal overflow):
 *
 *   [root]
 *    |
 *    +-- [child 1]
 *    |    +-- [sub 1]
 *    |    +-- [sub 2]
 *    +-- [child 2]
 *    +-- [child 3]
 */
export function TreeDiagram({ root, children, className = '' }) {
  return (
    <div className={`tree-diagram tree-diagram--vertical ${className}`}>
      <div className="tree-diagram__root">{root}</div>
      <div className="tree-diagram__body">
        {children.map((child, i) => (
          <div key={i} className="tree-diagram__row">
            <span className="tree-diagram__connector tree-diagram__connector--v" />
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Subtree: parent with children (vertical stack).
 * When collapsible=true, parent is clickable to expand/collapse children.
 */
export function TreeBranch({ parent, children, className = '', collapsible = false, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);

  const parentEl = collapsible ? (
    <div
      role="button"
      tabIndex={0}
      className="tree-branch__parent tree-branch__parent--collapsible"
      onClick={() => setOpen((o) => !o)}
      onKeyDown={(e) => e.key === 'Enter' && setOpen((o) => !o)}
      aria-expanded={open}
    >
      <span className="tree-branch__chevron">
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </span>
      {parent}
    </div>
  ) : (
    <div className="tree-branch__parent">{parent}</div>
  );

  return (
    <div className={`tree-branch tree-branch--vertical ${className}`}>
      {parentEl}
      {open && (
        <div className="tree-branch__children">
          {children.map((child, i) => (
            <div key={i} className="tree-branch__row">
              <span className="tree-branch__connector" />
              {child}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
