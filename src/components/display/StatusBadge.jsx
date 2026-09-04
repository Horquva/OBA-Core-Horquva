import React from 'react';
import './StatusBadge.css';

const StatusBadge = ({ status = 'approved', size = 'medium' }) => {
  const statusConfig = {
    approved: { label: 'Approved', color: 'green' },
    draft: { label: 'Draft', color: 'yellow' },
    deprecated: { label: 'Deprecated', color: 'red' },
    review: { label: 'In Review', color: 'blue' },
  };

  const config = statusConfig[status] || statusConfig.approved;

  return (
    <span 
      className={`status-badge status-badge--${config.color} status-badge--${size}`}
      role="status"
      aria-label={config.label}
    >
      {config.label}
    </span>
  );
};

export default StatusBadge;