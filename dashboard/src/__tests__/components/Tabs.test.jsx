import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tabs } from '../../components/ui/Tabs';

const mockTabs = [
  { id: 'overview', label: 'Team Overview' },
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'analytics', label: 'Analytics' },
];

describe('Tabs', () => {
  it('renders all tab labels', () => {
    render(<Tabs tabs={mockTabs} activeTab="overview" onChange={() => {}} />);
    expect(screen.getByText('Team Overview')).toBeInTheDocument();
    expect(screen.getByText('Leaderboard')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('marks active tab with active class', () => {
    render(<Tabs tabs={mockTabs} activeTab="leaderboard" onChange={() => {}} />);
    expect(screen.getByText('Leaderboard')).toHaveClass('tabs-btn-active');
    expect(screen.getByText('Team Overview')).not.toHaveClass('tabs-btn-active');
  });

  it('calls onChange with correct tab id on click', () => {
    const onChange = vi.fn();
    render(<Tabs tabs={mockTabs} activeTab="overview" onChange={onChange} />);
    fireEvent.click(screen.getByText('Analytics'));
    expect(onChange).toHaveBeenCalledWith('analytics');
  });

  it('renders with empty tabs array', () => {
    const { container } = render(<Tabs tabs={[]} activeTab="" onChange={() => {}} />);
    expect(container.querySelector('.tabs-wrapper')).toBeInTheDocument();
  });

  it('handles single tab', () => {
    render(<Tabs tabs={[{ id: 'only', label: 'Only Tab' }]} activeTab="only" onChange={() => {}} />);
    expect(screen.getByText('Only Tab')).toHaveClass('tabs-btn-active');
  });
});
