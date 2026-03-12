import React from 'react';
import { Sidebar } from './Sidebar';
import BackgroundScene from '../BackgroundScene';

export function Layout({ children }) {
  return (
    <>
      <BackgroundScene />
      <div className="app-container">
        <Sidebar />
        <main className="main-content" style={{ marginLeft: 'var(--sidebar-width)' }}>
          <div className="content-wrapper">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
