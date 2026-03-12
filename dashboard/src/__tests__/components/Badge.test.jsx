import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge, Button } from '../../components/ui/components';

describe('Badge', () => {
  it('renders children text', () => {
    render(<Badge>A+</Badge>);
    expect(screen.getByText('A+')).toBeInTheDocument();
  });

  it('applies default variant class', () => {
    const { container } = render(<Badge>Default</Badge>);
    expect(container.firstChild).toHaveClass('badge', 'badge-default');
  });

  it('applies success variant class', () => {
    const { container } = render(<Badge variant="success">Pass</Badge>);
    expect(container.firstChild).toHaveClass('badge-success');
  });

  it('applies warning variant class', () => {
    const { container } = render(<Badge variant="warning">Warn</Badge>);
    expect(container.firstChild).toHaveClass('badge-warning');
  });

  it('applies danger variant class', () => {
    const { container } = render(<Badge variant="danger">Fail</Badge>);
    expect(container.firstChild).toHaveClass('badge-danger');
  });

  it('applies info variant class', () => {
    const { container } = render(<Badge variant="info">Info</Badge>);
    expect(container.firstChild).toHaveClass('badge-info');
  });

  it('accepts custom className', () => {
    const { container } = render(<Badge className="custom">Test</Badge>);
    expect(container.firstChild).toHaveClass('custom');
  });

  it('falls back to default for unknown variant', () => {
    const { container } = render(<Badge variant="nonexistent">Test</Badge>);
    expect(container.firstChild).toHaveClass('badge-default');
  });
});

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('applies primary variant by default', () => {
    const { container } = render(<Button>Primary</Button>);
    expect(container.firstChild).toHaveClass('btn', 'btn-primary');
  });

  it('applies secondary variant', () => {
    const { container } = render(<Button variant="secondary">Sec</Button>);
    expect(container.firstChild).toHaveClass('btn-secondary');
  });

  it('applies ghost variant', () => {
    const { container } = render(<Button variant="ghost">Ghost</Button>);
    expect(container.firstChild).toHaveClass('btn-ghost');
  });

  it('applies fullWidth class', () => {
    const { container } = render(<Button fullWidth>Full</Button>);
    expect(container.firstChild).toHaveClass('btn-full');
  });

  it('renders as disabled when prop is set', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByText('Disabled')).toBeDisabled();
  });

  it('calls onClick handler', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    let clicked = false;
    render(<Button onClick={() => { clicked = true; }}>Click</Button>);
    await user.click(screen.getByText('Click'));
    expect(clicked).toBe(true);
  });

  it('renders with type submit', () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByText('Submit')).toHaveAttribute('type', 'submit');
  });
});
