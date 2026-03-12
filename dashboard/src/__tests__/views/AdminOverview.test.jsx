import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdminOverview } from '../../views/AdminOverview';

vi.mock('../../context/AppContext', () => ({
  useAppContext: vi.fn(),
}));

const { useAppContext } = await import('../../context/AppContext');

describe('AdminOverview', () => {
  it('shows empty state when no projects', () => {
    useAppContext.mockReturnValue({ projects: [] });
    render(<AdminOverview />);
    expect(screen.getByText('No Projects Found')).toBeInTheDocument();
  });

  it('shows empty state when projects is null', () => {
    useAppContext.mockReturnValue({ projects: null });
    render(<AdminOverview />);
    expect(screen.getByText('No Projects Found')).toBeInTheDocument();
  });

  it('renders project table when projects exist', () => {
    useAppContext.mockReturnValue({
      projects: [
        {
          project_id: 'p1',
          name: 'My Repo',
          author_count: 3,
          commit_count: 42,
          last_analyzed: '2025-01-15T10:00:00Z',
          registered_by: { name: 'Alice', email: 'alice@test.com' },
        },
      ],
    });

    render(<AdminOverview />);
    expect(screen.getByText('All Projects')).toBeInTheDocument();
    expect(screen.getByText('My Repo')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('shows "Never" for unanalyzed projects', () => {
    useAppContext.mockReturnValue({
      projects: [
        {
          project_id: 'p2',
          name: 'New Repo',
          author_count: 0,
          commit_count: 0,
          last_analyzed: null,
          registered_by: { name: 'Bob' },
        },
      ],
    });

    render(<AdminOverview />);
    expect(screen.getByText('Never')).toBeInTheDocument();
  });
});
