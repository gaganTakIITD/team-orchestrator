import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAppContext } from './context/AppContext';
import { Layout } from './components/layout/Layout';
import { AdminOverview } from './views/AdminOverview';
import { ProjectDashboard } from './views/ProjectDashboard';
import { LandingPage } from './views/LandingPage';
import { DocumentationPage } from './views/DocumentationPage';
import { LoginPage } from './views/LoginPage';
import { ProfileView } from './views/ProfileView';
import { SelectReposPage } from './views/SelectReposPage';

function DashboardContent() {
  const { currentRole, selectedProject, userEmail, loading } = useAppContext();

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '50vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (currentRole === 'Admin' && (!selectedProject || !selectedProject.project_id)) {
    return <AdminOverview />;
  }

  if (currentRole === 'User' && !selectedProject && !userEmail) {
    return (
      <div className="empty-state" style={{ minHeight: '60vh' }}>
        <div className="empty-state-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <h3>Welcome to Team Orchestrator</h3>
        <p>You are in <strong>Contributor Mode</strong>. Select a project from the sidebar to view your dashboard.</p>
      </div>
    );
  }

  if (!selectedProject) {
    return (
      <div className="empty-state" style={{ minHeight: '60vh' }}>
        <h3>No Project Selected</h3>
        <p>Select a project from the sidebar to view its details.</p>
      </div>
    );
  }

  return <ProjectDashboard project={selectedProject} />;
}

const AUTH_WAIT_MS = 5000;

function ProtectedRoute() {
  const { authUser, isAuthLoading, hasCompletedOnboarding } = useAppContext();
  const [authWaitElapsed, setAuthWaitElapsed] = useState(false);

  useEffect(() => {
    if (authUser) {
      setAuthWaitElapsed(false);
      return;
    }
    setAuthWaitElapsed(false);
    const t = setTimeout(() => setAuthWaitElapsed(true), AUTH_WAIT_MS);
    return () => clearTimeout(t);
  }, [authUser]);

  if (!authUser) {
    if (!authWaitElapsed) {
      return (
        <div className="flex-center" style={{ minHeight: '100vh', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="spinner" />
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            Checking authentication…
          </p>
        </div>
      );
    }
    return <Navigate to="/" replace />;
  }

  if (isAuthLoading || hasCompletedOnboarding === null) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

function OnboardingGuard() {
  const { authUser, isAuthLoading, hasCompletedOnboarding } = useAppContext();

  if (!authUser) {
    return <Navigate to="/" replace />;
  }

  if (isAuthLoading || hasCompletedOnboarding === null) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!hasCompletedOnboarding) {
    return <Navigate to="/dashboard/select-repos" replace />;
  }

  return <DashboardContent />;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/docs" element={<DocumentationPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<ProtectedRoute />}>
        <Route index element={<OnboardingGuard />} />
        <Route path="profile" element={<ProfileView />} />
        <Route path="select-repos" element={<SelectReposPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
