import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Leaderboard } from './sections/Leaderboard';
import { DeepDive } from './sections/DeepDive';
import { TeamOverview } from './sections/TeamOverview';
import { FeedbackCoach } from './sections/FeedbackCoach';
import { NLQuery } from './sections/NLQuery';
import { Analytics } from './sections/Analytics';
import { ExportReports } from './sections/ExportReports';
import { GlassCard } from '../components/layout/GlassCard';
import { Tabs } from '../components/ui/Tabs';
import { useAppContext } from '../context/AppContext';

export function ProjectDashboard({ project }) {
  const { mode, userEmail } = useAppContext();
  
  const [vectors, setVectors] = useState([]);
  const [commits, setCommits] = useState([]);
  const [insights, setInsights] = useState(null);
  const [peerMatrix, setPeerMatrix] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tab State
  const [activeTab, setActiveTab] = useState(mode === 'Admin' ? 'overview' : 'my_performance');

  // Change default tab if mode switches while mounted
  useEffect(() => {
    setActiveTab(mode === 'Admin' ? 'overview' : 'my_performance');
  }, [mode]);

  useEffect(() => {
    let active = true;
    async function loadData() {
      setLoading(true);
      if (!project?.project_id) return;

      const [vData, cData, iData, pData] = await Promise.all([
        api.getProjectResults(project.project_id),
        api.getProjectCommits(project.project_id),
        api.getProjectInsights(project.project_id),
        api.getPeerMatrix(project.project_id),
      ]);

      if (active) {
        setVectors(vData || []);
        setCommits(cData || []);
        setInsights(iData);
        setPeerMatrix(pData || []);
        setLoading(false);
      }
    }

    loadData();
    return () => { active = false; };
  }, [project]);

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '50vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!vectors.length) {
    return (
      <div className="empty-state" style={{ minHeight: '50vh' }}>
        <div className="empty-state-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3>No Results Yet</h3>
        <p>
          Run <code>team-orchestrator analyze</code> in the repository to generate insights for {project.name}.
        </p>
      </div>
    );
  }

  const totalCommits = vectors.reduce((acc, v) => acc + (v.total_commits || 0), 0);
  const avgComposite = vectors.length
    ? (vectors.reduce((acc, v) => acc + (v.composite_score || 0), 0) / vectors.length).toFixed(2)
    : 0;
  const totalSpam = vectors.reduce((acc, v) => acc + (v.quality_flags?.spam_commits || 0), 0);

  // Tabs Configuration
  const adminTabs = [
    { id: 'overview', label: 'Team Overview' },
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'ask_ai', label: 'Ask AI' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'export', label: 'Export' },
  ];

  const userTabs = [
    { id: 'my_performance', label: 'My Performance' },
    { id: 'my_coaching', label: 'My Coaching' },
  ];

  const tabs = mode === 'Admin' ? adminTabs : userTabs;

  return (
    <div className="space-y-8 slide-up" style={{ paddingBottom: 'var(--space-20)' }}>
      <div className="dashboard-header">
        <h2>{project.name} {mode === 'Admin' ? 'Supervisor View' : 'Contributor View'}</h2>
      </div>

      {mode === 'Admin' && (
        <div className="grid-4col">
          <GlassCard className="stat-card">
            <div className="stat-value accent">{vectors.length}</div>
            <div className="stat-label">Team Members</div>
          </GlassCard>
          <GlassCard className="stat-card">
            <div className="stat-value success">{totalCommits}</div>
            <div className="stat-label">Total Commits</div>
          </GlassCard>
          <GlassCard className="stat-card">
            <div className="stat-value info">{avgComposite}/5.0</div>
            <div className="stat-label">Avg Score</div>
          </GlassCard>
          <GlassCard className="stat-card">
            <div className="stat-value danger">{totalSpam}</div>
            <div className="stat-label">Spam Commits</div>
          </GlassCard>
        </div>
      )}

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab Routing */}
      <div className="tab-content" style={{ marginTop: 'var(--space-6)' }}>
        {mode === 'Admin' && (
          <>
            {activeTab === 'overview' && <TeamOverview vectors={vectors} commits={commits} />}
            {activeTab === 'leaderboard' && <Leaderboard vectors={vectors} />}
            {activeTab === 'ask_ai' && <NLQuery />}
            {activeTab === 'analytics' && <Analytics insights={insights} commits={commits} />}
            {activeTab === 'export' && <ExportReports project={project} vectors={vectors} />}
          </>
        )}

        {mode === 'User' && (
          <>
            {activeTab === 'my_performance' && (
              <DeepDive vectors={vectors} commits={commits} forceUserEmail={userEmail} />
            )}
            {activeTab === 'my_coaching' && (
              <FeedbackCoach vectors={vectors} peerMatrix={peerMatrix} forceUserEmail={userEmail} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
