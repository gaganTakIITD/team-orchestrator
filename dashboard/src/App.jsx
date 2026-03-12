import React from 'react';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import AppRouter from './AppRouter';
import { GlobalChat } from './components/chat/GlobalChat';
import './index.css';

function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <AppRouter />
        <GlobalChat />
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
