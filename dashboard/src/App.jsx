import React from 'react';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/Toast';
import { CommandPalette } from './components/CommandPalette';
import { GlobalChat } from './components/chat/GlobalChat';
import AppRouter from './AppRouter';
import './index.css';

function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <ToastProvider>
          <AppRouter />
          <CommandPalette />
          <GlobalChat />
        </ToastProvider>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
