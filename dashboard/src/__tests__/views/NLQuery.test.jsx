import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NLQuery } from '../../views/sections/NLQuery';

vi.mock('../../api/client', () => ({
  api: {
    askQuestion: vi.fn(),
  },
}));

describe('NLQuery', () => {
  let apiMock;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../../api/client');
    apiMock = mod.api;
  });

  it('renders the section header', () => {
    render(<NLQuery />);
    const headers = screen.getAllByText('Ask AI');
    expect(headers.length).toBeGreaterThanOrEqual(1);
    expect(headers[0].closest('.section-header')).toBeInTheDocument();
  });

  it('renders input and button', () => {
    render(<NLQuery />);
    expect(screen.getByPlaceholderText(/who contributed/i)).toBeInTheDocument();
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('disables button when input is empty', () => {
    render(<NLQuery />);
    const buttons = screen.getAllByRole('button');
    const askBtn = buttons.find(b => b.textContent.includes('Ask AI'));
    expect(askBtn).toBeDisabled();
  });

  it('submits query and shows response', async () => {
    apiMock.askQuestion.mockResolvedValue({ answer: 'Alice contributed the most bug fixes.' });

    render(<NLQuery />);
    const input = screen.getByPlaceholderText(/who contributed/i);

    fireEvent.change(input, { target: { value: 'Who contributed the most?' } });
    fireEvent.submit(input.closest('form'));

    await waitFor(() => {
      expect(screen.getByText('Alice contributed the most bug fixes.')).toBeInTheDocument();
    });
    expect(screen.getByText('AI Response')).toBeInTheDocument();
  });

  it('shows fallback message when API returns null', async () => {
    apiMock.askQuestion.mockResolvedValue(null);

    render(<NLQuery />);
    const input = screen.getByPlaceholderText(/who contributed/i);

    fireEvent.change(input, { target: { value: 'Test question' } });
    fireEvent.submit(input.closest('form'));

    await waitFor(() => {
      expect(screen.getByText(/could not reach api/i)).toBeInTheDocument();
    });
  });
});
