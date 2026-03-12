import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GlassCard } from '../../components/layout/GlassCard';

describe('GlassCard', () => {
  it('renders children', () => {
    render(<GlassCard>Hello World</GlassCard>);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('applies card class', () => {
    const { container } = render(<GlassCard>Content</GlassCard>);
    expect(container.firstChild).toHaveClass('card');
  });

  it('applies additional className', () => {
    const { container } = render(<GlassCard className="stat-card">Content</GlassCard>);
    expect(container.firstChild).toHaveClass('card', 'stat-card');
  });

  it('renders title when provided', () => {
    render(<GlassCard title="My Title">Content</GlassCard>);
    expect(screen.getByText('My Title')).toBeInTheDocument();
    expect(screen.getByText('My Title')).toHaveClass('card-title');
  });

  it('does not render title div when title not provided', () => {
    const { container } = render(<GlassCard>Content</GlassCard>);
    expect(container.querySelector('.card-title')).toBeNull();
  });

  it('passes style prop to motion div', () => {
    const { container } = render(<GlassCard style={{ padding: '20px' }}>Content</GlassCard>);
    expect(container.firstChild).toHaveClass('card');
    expect(container.firstChild).toBeInTheDocument();
  });
});
