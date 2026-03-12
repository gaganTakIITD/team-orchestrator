import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Leaderboard } from './sections/Leaderboard';
import { DeepDive } from './sections/DeepDive';
import { TeamOverview } from './sections/TeamOverview';
import { FeedbackCoach } from './sections/FeedbackCoach';
import { NLQuery } from './sections/NLQuery';
import { Analytics } from './sections/Analytics';
import { ExportReports } from './sections/ExportReports';
import { CommitHeatmap } from './sections/CommitHeatmap';
import { ActivityFeed } from './sections/ActivityFeed';
import { TeamHealth } from './sections/TeamHealth';
import { GlassCard } from '../components/layout/GlassCard';
import { Tabs } from '../components/ui/Tabs';
import { useAppContext } from '../context/AppContext';

const IconUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconGitCommit = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" /><line x1="1.05" y1="12" x2="7" y2="12" /><line x1="17.01" y1="12" x2="22.96" y2="12" />
  </svg>
);

const IconTrendingUp = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
  </svg>
);

const IconAlertTriangle = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export function ProjectDashboard({ project }) {
  const { mode, userEmail } = useAppContext();

  const [vectors, setVectors] = useState([]);
  const [commits, setCommits] = useState([]);
  const [insights, setInsights] = useState(null);
  const [peerMatrix, setPeerMatrix] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(mode === 'Admin' ? 'health' : 'my_performance');

  useEffect(() => {
    setActiveTab(mode === 'Admin' ? 'health' : 'my_performance');
  }, [mode]);

  useEffect(() => {
    let active = true;
    async function loadData() {
      if (!project?.project_id) return;

      if (project.is_setup === false) {
        setVectors([]);
        setCommits([]);
        setInsights(null);
        setPeerMatrix([]);
        setLoading(false);
        return;
      }

      setLoading(true);
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
        <p>Run <code>team-orchestrator analyze</code> in the repository to generate insights for {project.name}.</p>
      </div>
    );
  }

  const totalCommits = vectors.reduce((acc, v) => acc + (v.total_commits || 0), 0);
  const avgComposite = vectors.length
    ? (vectors.reduce((acc, v) => acc + (v.composite_score || 0), 0) / vectors.length).toFixed(2)
    : 0;
  const totalSpam = vectors.reduce((acc, v) => acc + (v.quality_flags?.spam_commits || 0), 0);

  const adminTabs = [
    { id: 'health', label: 'Health' },
    { id: 'overview', label: 'Team Overview' },
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'heatmap', label: 'Heatmap' },
    { id: 'activity', label: 'Activity' },
    { id: 'ask_ai', label: 'Ask AI' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'export', label: 'Export' },
  ];

  const userTabs = [
    { id: 'my_performance', label: 'My Performance' },
    { id: 'my_coaching', label: 'My Coaching' },
  ];

  const tabs = mode === 'Admin' ? adminTabs : userTabs;
  const roleLabel = mode === 'Admin' ? 'Supervisor View' : 'Contributor View';

  return (
    <div className="slide-up">
      <div className="dashboard-header">
        <h2>
          {project.name}
          <span className="role-badge">{roleLabel}</span>
        </h2>
        <p>{mode === 'Admin' ? 'Team analytics and management' : 'Your personal contribution insights'}</p>
      </div>

      {mode === 'Admin' && (
        <div className="grid-4col" style={{ marginBottom: 'var(--space-6)', marginTop: 'var(--space-4)' }}>
          <GlassCard className="stat-card" delay={0}>
            <div className="stat-card-row">
              <div className="stat-icon accent"><IconUsers /></div>
              <div>
                <div className="stat-value accent">{vectors.length}</div>
                <div className="stat-label">Team Members</div>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="stat-card" delay={0.05}>
            <div className="stat-card-row">
              <div className="stat-icon success"><IconGitCommit /></div>
              <div>
                <div className="stat-value success">{totalCommits}</div>
                <div className="stat-label">Total Commits</div>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="stat-card" delay={0.1}>
            <div className="stat-card-row">
              <div className="stat-icon info"><IconTrendingUp /></div>
              <div>
                <div className="stat-value info">{avgComposite}/5</div>
                <div className="stat-label">Avg Score</div>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="stat-card" delay={0.15}>
            <div className="stat-card-row">
              <div className="stat-icon danger"><IconAlertTriangle /></div>
              <div>
                <div className="stat-value danger">{totalSpam}</div>
                <div className="stat-label">Spam Commits</div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="tab-content">
        {mode === 'Admin' && (
          <>
            {activeTab === 'health' && <TeamHealth vectors={vectors} insights={insights} />}
            {activeTab === 'overview' && <TeamOverview vectors={vectors} commits={commits} />}
            {activeTab === 'leaderboard' && <Leaderboard vectors={vectors} />}
            {activeTab === 'heatmap' && <CommitHeatmap commits={commits} />}
            {activeTab === 'activity' && <ActivityFeed commits={commits} />}
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
