import React from 'react';
import { FolderGit2, GitCommitHorizontal, Workflow, ServerCog, LayoutDashboard, GitMerge } from 'lucide-react';
import { TreeDiagram, TreeBranch } from './TreeDiagram';

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function WorkflowDiagram() {
  return (
    <div className="workflow-diagram">
      <div className="workflow-diagram__label">Click a node to jump to its section</div>
      <TreeDiagram
        root={
          <div className="tree-node tree-node--root">
            <GitMerge size={22} strokeWidth={2} />
            <span>Team Orchestrator Flow</span>
          </div>
        }
        children={[
          <TreeBranch
            key="dev"
            collapsible
            defaultOpen
            parent={
              <div className="tree-node tree-node--parent">
                <span>Developer Machine</span>
              </div>
            }
            children={[
              <button key="g" type="button" className="tree-node tree-node--leaf" onClick={() => scrollToSection('quick-start')}>
                <FolderGit2 size={18} /><span>Git Repository</span>
              </button>,
              <button key="h" type="button" className="tree-node tree-node--leaf" onClick={() => scrollToSection('cli-commands')}>
                <GitCommitHorizontal size={18} /><span>Post-commit Hook</span>
              </button>,
              <button key="p" type="button" className="tree-node tree-node--leaf" onClick={() => scrollToSection('pipeline-stages')}>
                <Workflow size={18} /><span>Local Pipeline</span>
              </button>,
            ]}
          />,
          <TreeBranch
            key="server"
            collapsible
            defaultOpen
            parent={<div className="tree-node tree-node--parent"><span>Server</span></div>}
            children={[
              <button key="f" type="button" className="tree-node tree-node--leaf" onClick={() => scrollToSection('quick-start')}>
                <ServerCog size={18} /><span>FastAPI Server</span>
              </button>,
            ]}
          />,
          <TreeBranch
            key="ui"
            collapsible
            defaultOpen
            parent={<div className="tree-node tree-node--parent"><span>Dashboard</span></div>}
            children={[
              <button key="r" type="button" className="tree-node tree-node--leaf" onClick={() => scrollToSection('quick-start')}>
                <LayoutDashboard size={18} /><span>React Dashboard</span>
              </button>,
            ]}
          />,
        ]}
      />
    </div>
  );
}
