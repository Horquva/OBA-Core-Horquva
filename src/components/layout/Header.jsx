import React from 'react';
import './Header.css';

const Header = () => {
  return (
    <header className="app-header">
      <div className="header-brand">
        <h2>KMP</h2>
      </div>
      <nav className="header-nav">
        <a href="#home">Home</a>
        <a href="#docs">Docs</a>
      </nav>
    </header>
  );
};

export default Header;