import React, { useState } from 'react';
import { GitBranch, FileSearch, Brain, Database, BarChart3, MessageSquare, ChevronRight, ChevronDown } from 'lucide-react';

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function PipelineStage({ stage, depth = 0 }) {
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = stage.children && stage.children.length > 0;

  return (
    <div className="pipeline-tree__stage">
      <button
        type="button"
        className={`pipeline-tree__row ${hasChildren ? 'pipeline-tree__row--parent' : 'pipeline-tree__row--leaf'}`}
        style={{ paddingLeft: `${12 + depth * 24}px` }}
        onClick={() => {
          if (hasChildren) setOpen((o) => !o);
          else if (stage.target) scrollToSection(stage.target);
        }}
      >
        <span className="pipeline-tree__chevron">
          {hasChildren ? (open ? <ChevronDown size={16} /> : <ChevronRight size={16} />) : <span className="pipeline-tree__spacer" />}
        </span>
        {stage.step ? <span className="pipeline-tree__num">{stage.step}</span> : <span className="pipeline-tree__num-spacer" />}
        <stage.icon size={18} strokeWidth={2} />
        <span>{stage.label}</span>
      </button>
      {hasChildren && open && (
        <div className="pipeline-tree__children">
          {stage.children.map((child, i) => (
            <PipelineStage key={i} stage={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

const pipelineTree = {
  label: 'Analysis Pipeline',
  icon: GitBranch,
  step: null,
  target: null,
  children: [
    {
      label: 'Extract',
      icon: GitBranch,
      step: 1,
      target: 'pipeline-extract',
    },
    {
      label: 'Preprocess',
      icon: FileSearch,
      step: 2,
      target: 'pipeline-preprocess',
      children: [
        { label: 'Structural', icon: FileSearch, target: 'pipeline-preprocess' },
        { label: 'Statistical', icon: FileSearch, target: 'pipeline-preprocess' },
        { label: 'Cross-commit', icon: FileSearch, target: 'pipeline-preprocess' },
        { label: 'Flags', icon: FileSearch, target: 'pipeline-preprocess' },
        { label: 'Features', icon: FileSearch, target: 'pipeline-preprocess' },
      ],
    },
    {
      label: 'AI Analysis',
      icon: Brain,
      step: 3,
      target: 'pipeline-analyze',
      children: [
        { label: 'Spam (phi3)', icon: Brain, target: 'pipeline-analyze' },
        { label: 'Quality (llama3.1)', icon: Brain, target: 'pipeline-analyze' },
        { label: 'Coaching', icon: Brain, target: 'pipeline-analyze' },
      ],
    },
    {
      label: 'Index',
      icon: Database,
      step: 4,
      target: 'pipeline-index',
    },
    {
      label: 'Aggregate',
      icon: BarChart3,
      step: 5,
      target: 'pipeline-aggregate',
    },
    {
      label: 'Coaching',
      icon: MessageSquare,
      step: 6,
      target: 'pipeline-coach',
    },
  ],
};

export function PipelineDiagram() {
  return (
    <div className="pipeline-diagram pipeline-tree">
      <div className="pipeline-diagram__label">Click to expand/collapse or jump to section</div>
      <div className="pipeline-tree__root">
        <PipelineStage stage={pipelineTree} depth={0} />
      </div>
    </div>
  );
}
