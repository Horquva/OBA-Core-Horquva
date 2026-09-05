import React from 'react';
import './RelatedLinks.css';

const RelatedLinks = ({ items = [], onNavigate = () => {} }) => {
  if (!items || items.length === 0) return null;

  return (
    <ul className="related-links">
      {items.map((item) => (
        <li key={item.id} className="related-links__item">
          <button
            className="related-links__button"
            onClick={() => onNavigate(item.id)}
          >
            <span className="related-links__icon">→</span>
            <span className="related-links__text">
              <span className="related-links__title">{item.title}</span>
              {item.category && (
                <span className="related-links__category">{item.category}</span>
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
};

export default RelatedLinks;