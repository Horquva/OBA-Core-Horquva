import React from 'react';
import './MainNav.css';

/**
 * MainNav Component
 * Primary navigation menu with 8 knowledge categories
 * Desktop horizontal, mobile responsive
 * 
 * @component
 * @example
 * <MainNav active="standards" onNavigate={(category) => {}} />
 */
const MainNav = ({ active = null, onNavigate = () => {} }) => {
  const categories = [
    { id: 'standards', label: 'Standards', icon: '📋' },
    { id: 'practices', label: 'Best Practices', icon: '✨' },
    { id: 'playbooks', label: 'Playbooks', icon: '📖' },
    { id: 'runbooks', label: 'Runbooks', icon: '⚙️' },
    { id: 'lessons', label: 'Lessons Learned', icon: '💡' },
    { id: 'adrs', label: 'ADRs', icon: '🏗️' },
    { id: 'glossary', label: 'Glossary', icon: '📚' },
    { id: 'docs', label: 'Documentation', icon: '📄' },
  ];

  return (
    <nav className="main-nav" aria-label="Knowledge categories">
      <ul className="main-nav__list">
        {categories.map((cat) => (
          <li key={cat.id} className="main-nav__item">
            <button
              className={`main-nav__button ${active === cat.id ? 'main-nav__button--active' : ''}`}
              onClick={() => onNavigate(cat.id)}
              aria-current={active === cat.id ? 'page' : undefined}
            >
              <span className="main-nav__icon">{cat.icon}</span>
              <span className="main-nav__label">{cat.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default MainNav;
