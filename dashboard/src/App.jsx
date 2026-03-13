import React from 'react';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { SidebarProvider } from './context/SidebarContext';
import { ToastProvider } from './components/Toast';
import { CommandPalette } from './components/CommandPalette';
import { ChatHub } from './components/chat/ChatHub';
import AppRouter from './AppRouter';
import './index.css';

function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <SidebarProvider>
        <ToastProvider>
          <AppRouter />
          <CommandPalette />
          <ChatHub />
        </ToastProvider>
        </SidebarProvider>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
