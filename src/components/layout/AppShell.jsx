import React from 'react';
import Header from './Header';
import Footer from './Footer';
import './AppShell.css';

const AppShell = ({ children, appVersion }) => {
  return (
    <div className="app-shell">
      <Header />
      <main className="app-content">{children}</main>
      <Footer appVersion={appVersion} />
    </div>
  );
};

export default AppShell;