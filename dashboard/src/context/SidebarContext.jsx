import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const SIDEBAR_STORAGE_KEY = 'team-orchestrator-sidebar-width';
const MIN_WIDTH = 200;
const MAX_WIDTH = 420;
const DEFAULT_WIDTH = 280;

const SidebarContext = createContext(null);

export function SidebarProvider({ children }) {
  const [width, setWidthState] = useState(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      const n = parseInt(stored, 10);
      if (!isNaN(n) && n >= MIN_WIDTH && n <= MAX_WIDTH) return n;
    } catch (_) {}
    return DEFAULT_WIDTH;
  });

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(width));
    } catch (_) {}
  }, [width]);

  const setWidth = useCallback((w) => {
    setWidthState((prev) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, w)));
  }, []);

  const value = { width, setWidth, minWidth: MIN_WIDTH, maxWidth: MAX_WIDTH };
  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
}
