import React from 'react';
import { Sidebar } from './Sidebar';
import BackgroundScene from '../BackgroundScene';

export function Layout({ children }) {
  return (
    <>
      <BackgroundScene />
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <div className="content-wrapper">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
 