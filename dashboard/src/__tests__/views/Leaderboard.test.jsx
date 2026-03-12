import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Leaderboard } from '../../views/sections/Leaderboard';

const mockVectors = [
  { email: 'a@test.com', name: 'Alice', composite_score: 4.5, suggested_grade: 'A+', total_commits: 20, quality_flags: { spam_rate: 0.05 } },
  { email: 'b@test.com', name: 'Bob', composite_score: 3.8, suggested_grade: 'B+', total_commits: 15, quality_flags: { spam_rate: 0.1 } },
  { email: 'c@test.com', name: 'Charlie', composite_score: 2.1, suggested_grade: 'D', total_commits: 8, quality_flags: { spam_rate: 0.3 } },
];

describe('Leaderboard', () => {
  it('returns null when vectors is empty', () => {
    const { container } = render(<Leaderboard vectors={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when vectors is null', () => {
    const { container } = render(<Leaderboard vectors={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders leaderboard header', () => {
    render(<Leaderboard vectors={mockVectors} />);
    expect(screen.getByText('Leaderboard')).toBeInTheDocument();
  });

  it('sorts by composite score descending', () => {
    render(<Leaderboard vectors={mockVectors} />);
    const rows = screen.getAllByRole('row');
    const dataRows = rows.slice(1);
    expect(dataRows[0]).toHaveTextContent('Alice');
    expect(dataRows[1]).toHaveTextContent('Bob');
    expect(dataRows[2]).toHaveTextContent('Charlie');
  });

  it('displays grades as badges', () => {
    render(<Leaderboard vectors={mockVectors} />);
    expect(screen.getByText('A+')).toBeInTheDocument();
    expect(screen.getByText('B+')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  it('shows spam rate percentage', () => {
    render(<Leaderboard vectors={mockVectors} />);
    expect(screen.getByText('5%')).toBeInTheDocument();
    expect(screen.getByText('10%')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
  });

  it('renders composite scores chart section', () => {
    render(<Leaderboard vectors={mockVectors} />);
    expect(screen.getByText('Composite Scores')).toBeInTheDocument();
  });
});
