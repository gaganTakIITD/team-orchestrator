import React from 'react';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/Toast';
import { CommandPalette } from './components/CommandPalette';
import { ChatHub } from './components/chat/ChatHub';
import AppRouter from './AppRouter';
import './index.css';

function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <ToastProvider>
          <AppRouter />
          <CommandPalette />
          <ChatHub />
        </ToastProvider>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
