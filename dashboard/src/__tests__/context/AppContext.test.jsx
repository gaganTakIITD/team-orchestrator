import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AppProvider, useAppContext } from '../../context/AppContext';

vi.mock('../../api/client', () => ({
  api: {
    getMe: vi.fn(),
    getProjects: vi.fn(),
    getGithubRepos: vi.fn(),
    getSelectedRepos: vi.fn(),
    addSelectedRepos: vi.fn(),
    removeSelectedRepo: vi.fn(),
    getStatus: vi.fn(),
    logout: vi.fn(),
  }
}));

function TestConsumer() {
  const ctx = useAppContext();
  return (
    <div>
      <span data-testid="loading">{ctx.isAuthLoading ? 'loading' : 'done'}</span>
      <span data-testid="user">{ctx.authUser?.email || 'none'}</span>
      <span data-testid="role">{ctx.currentRole}</span>
      <span data-testid="userEmail">{ctx.userEmail || 'null'}</span>
      <span data-testid="projectCount">{ctx.projects.length}</span>
      <button data-testid="logout" onClick={ctx.logout}>logout</button>
    </div>
  );
}

describe('AppContext', () => {
  let apiMock;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../../api/client');
    apiMock = mod.api;
    apiMock.getStatus.mockResolvedValue(null);
    apiMock.getSelectedRepos.mockResolvedValue({ repos: [], count: 0 });
  });

  it('provides isAuthLoading=true initially, then resolves', async () => {
    apiMock.getMe.mockResolvedValue(null);

    render(
      <AppProvider><TestConsumer /></AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('done');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('none');
  });

  it('provides authenticated user data', async () => {
    apiMock.getMe.mockResolvedValue({ email: 'test@test.com', name: 'Test User' });
    apiMock.getProjects.mockResolvedValue([]);
    apiMock.getGithubRepos.mockResolvedValue({ repos: [] });

    render(
      <AppProvider><TestConsumer /></AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@test.com');
    });
    expect(screen.getByTestId('userEmail')).toHaveTextContent('test@test.com');
  });

  it('sets currentRole to User when no project selected', async () => {
    apiMock.getMe.mockResolvedValue({ email: 'a@b.com' });
    apiMock.getProjects.mockResolvedValue([]);
    apiMock.getGithubRepos.mockResolvedValue({ repos: [] });

    render(
      <AppProvider><TestConsumer /></AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('role')).toHaveTextContent('User');
    });
  });

  it('handles logout correctly', async () => {
    apiMock.getMe.mockResolvedValue({ email: 'a@b.com' });
    apiMock.getProjects.mockResolvedValue([]);
    apiMock.getGithubRepos.mockResolvedValue({ repos: [] });
    apiMock.logout.mockResolvedValue(true);

    render(
      <AppProvider><TestConsumer /></AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('a@b.com');
    });

    await act(async () => {
      screen.getByTestId('logout').click();
    });

    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(screen.getByTestId('projectCount')).toHaveTextContent('0');
  });
});
