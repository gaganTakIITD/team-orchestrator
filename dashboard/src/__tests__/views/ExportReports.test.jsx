import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExportReports } from '../../views/sections/ExportReports';

const mockProject = { name: 'My Project', project_id: 'p1' };
const mockVectors = [
  { name: 'Alice', email: 'alice@test.com', composite_score: 4.2, total_commits: 10 },
  { name: 'Bob', email: 'bob@test.com', composite_score: 3.5, total_commits: 8 },
];

describe('ExportReports', () => {
  it('returns null when vectors is empty', () => {
    const { container } = render(<ExportReports project={mockProject} vectors={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders export header', () => {
    render(<ExportReports project={mockProject} vectors={mockVectors} />);
    expect(screen.getByText('Export Reports')).toBeInTheDocument();
  });

  it('renders individual profile card', () => {
    render(<ExportReports project={mockProject} vectors={mockVectors} />);
    expect(screen.getByText('Individual Profile')).toBeInTheDocument();
  });

  it('renders team data card', () => {
    render(<ExportReports project={mockProject} vectors={mockVectors} />);
    expect(screen.getByText('Full Team Data')).toBeInTheDocument();
  });

  it('shows member selector with all names', () => {
    render(<ExportReports project={mockProject} vectors={mockVectors} />);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('Alice');
    expect(options[1]).toHaveTextContent('Bob');
  });

  it('renders download buttons', () => {
    render(<ExportReports project={mockProject} vectors={mockVectors} />);
    expect(screen.getByText(/download alice/i)).toBeInTheDocument();
    expect(screen.getByText(/download all/i)).toBeInTheDocument();
  });

  it('shows project name in description', () => {
    render(<ExportReports project={mockProject} vectors={mockVectors} />);
    expect(screen.getByText(/My Project/)).toBeInTheDocument();
  });
});
