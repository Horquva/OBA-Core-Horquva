import React from 'react';
import './AssetCard.css';

const AssetCard = ({
  id,
  title,
  category,
  status = 'approved',
  summary,
  owner,
  lastUpdated,
  onClick = () => {},
}) => {
  const statusColor = {
    approved: '#10b981',
    draft: '#f59e0b',
    deprecated: '#ef4444',
  };

  return (
    <article className="asset-card" onClick={() => onClick(id)}>
      <div className="asset-card__header">
        <h3 className="asset-card__title">{title}</h3>
        <span 
          className={`asset-card__status asset-card__status--${status}`}
          title={status}
        >
          {status}
        </span>
      </div>

      <p className="asset-card__summary">{summary}</p>

      <div className="asset-card__meta">
        <span className="asset-card__category">{category}</span>
        {owner && <span className="asset-card__owner">by {owner}</span>}
        {lastUpdated && (
          <span className="asset-card__date">
            Updated {new Date(lastUpdated).toLocaleDateString()}
          </span>
        )}
      </div>
    </article>
  );
};

export default AssetCard;