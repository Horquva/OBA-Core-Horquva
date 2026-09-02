import React from 'react';
import './MetadataPanel.css';

const MetadataPanel = ({
  owner,
  ownerEmail,
  createdDate,
  lastUpdatedDate,
  lastUpdatedBy,
  category,
  version,
}) => {
  return (
    <aside className="metadata-panel">
      <h3 className="metadata-panel__title">Metadata</h3>

      {owner && (
        <div className="metadata-panel__item">
          <dt className="metadata-panel__label">Owner</dt>
          <dd className="metadata-panel__value">
            {ownerEmail ? (
              <a href={`mailto:${ownerEmail}`}>{owner}</a>
            ) : (
              owner
            )}
          </dd>
        </div>
      )}

      {createdDate && (
        <div className="metadata-panel__item">
          <dt className="metadata-panel__label">Created</dt>
          <dd className="metadata-panel__value">
            {new Date(createdDate).toLocaleDateString()}
          </dd>
        </div>
      )}

      {lastUpdatedDate && (
        <div className="metadata-panel__item">
          <dt className="metadata-panel__label">Last Updated</dt>
          <dd className="metadata-panel__value">
            {new Date(lastUpdatedDate).toLocaleDateString()}
          </dd>
        </div>
      )}

      {lastUpdatedBy && (
        <div className="metadata-panel__item">
          <dt className="metadata-panel__label">Updated By</dt>
          <dd className="metadata-panel__value">{lastUpdatedBy}</dd>
        </div>
      )}

      {category && (
        <div className="metadata-panel__item">
          <dt className="metadata-panel__label">Category</dt>
          <dd className="metadata-panel__value">{category}</dd>
        </div>
      )}

      {version && (
        <div className="metadata-panel__item">
          <dt className="metadata-panel__label">Version</dt>
          <dd className="metadata-panel__value">{version}</dd>
        </div>
      )}
    </aside>
  );
};

export default MetadataPanel;