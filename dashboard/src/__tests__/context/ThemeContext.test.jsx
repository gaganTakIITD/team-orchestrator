import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../../context/ThemeContext';

function TestConsumer() {
  const { theme, setTheme, THEMES } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="themes">{THEMES.join(',')}</span>
      <button data-testid="set-light" onClick={() => setTheme('light')}>Light</button>
      <button data-testid="set-dark" onClick={() => setTheme('dark')}>Dark</button>
      <button data-testid="set-comfort" onClick={() => setTheme('comfort')}>Comfort</button>
    </div>
  );
}

const mockStore = {};
const mockLocalStorage = {
  getItem: vi.fn((key) => mockStore[key] || null),
  setItem: vi.fn((key, val) => { mockStore[key] = val; }),
  removeItem: vi.fn((key) => { delete mockStore[key]; }),
  clear: vi.fn(() => { Object.keys(mockStore).forEach(k => delete mockStore[k]); }),
  get length() { return Object.keys(mockStore).length; },
  key: vi.fn((i) => Object.keys(mockStore)[i] || null),
};

beforeEach(() => {
  Object.keys(mockStore).forEach(k => delete mockStore[k]);
  vi.stubGlobal('localStorage', mockLocalStorage);
  document.documentElement.removeAttribute('data-theme');
  vi.clearAllMocks();
});

describe('ThemeContext', () => {
  it('provides default dark theme', () => {
    render(<ThemeProvider><TestConsumer /></ThemeProvider>);
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });

  it('provides all theme options', () => {
    render(<ThemeProvider><TestConsumer /></ThemeProvider>);
    expect(screen.getByTestId('themes')).toHaveTextContent('dark,light,comfort');
  });

  it('switches theme and sets data-theme attribute', () => {
    render(<ThemeProvider><TestConsumer /></ThemeProvider>);
    act(() => { screen.getByTestId('set-light').click(); });
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('persists theme in localStorage', () => {
    render(<ThemeProvider><TestConsumer /></ThemeProvider>);
    act(() => { screen.getByTestId('set-comfort').click(); });
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('team-orchestrator-theme', 'comfort');
  });

  it('restores theme from localStorage', () => {
    mockStore['team-orchestrator-theme'] = 'light';
    render(<ThemeProvider><TestConsumer /></ThemeProvider>);
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
  });
});
