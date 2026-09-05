import React from 'react';
import './Footer.css';

const Footer = ({ appVersion }) => {
  return (
    <footer className="app-footer">
      <p>&copy; {new Date().getFullYear()} Knowledge Management Platform</p>
      {appVersion && <span className="app-version">v{appVersion}</span>}
    </footer>
  );
};

export default Footer;