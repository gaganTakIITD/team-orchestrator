import React from 'react';
import { useSidebar } from '../../context/SidebarContext';
import { Sidebar } from './Sidebar';
import BackgroundScene from '../BackgroundScene';

export function Layout({ children }) {
  const { width } = useSidebar();
  return (
    <>
      <BackgroundScene />
      <div className="app-container" style={{ '--sidebar-width': `${width}px` }}>
        <Sidebar />
        <main className="main-content" style={{ marginLeft: `${width}px` }}>
          <div className="content-wrapper">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
