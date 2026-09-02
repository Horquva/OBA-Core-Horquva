import React from 'react';
import MetadataPanel from './MetadataPanel';
import RelatedLinks from './RelatedLinks';
import './DetailViewer.css';

const DetailViewer = ({
  title,
  category,
  status = 'approved',
  content,
  metadata = {},
  relatedAssets = [],
  onRelatedClick = () => {},
}) => {
  return (
    <article className="detail-viewer">
      <div className="detail-viewer__container">
        {/* Header */}
        <header className="detail-viewer__header">
          <h1 className="detail-viewer__title">{title}</h1>
          <span className={`detail-viewer__status detail-viewer__status--${status}`}>
            {status}
          </span>
        </header>

        <div className="detail-viewer__content-wrapper">
          {/* Main Content */}
          <div className="detail-viewer__main">
            <div className="detail-viewer__body">
              {content ? (
                <div dangerouslySetInnerHTML={{ __html: content }} />
              ) : (
                <p>No content available</p>
              )}
            </div>

            {/* Related Assets */}
            {relatedAssets.length > 0 && (
              <section className="detail-viewer__related">
                <h2>Related Knowledge</h2>
                <RelatedLinks
                  items={relatedAssets}
                  onNavigate={onRelatedClick}
                />
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="detail-viewer__sidebar">
            <MetadataPanel {...metadata} />
          </aside>
        </div>
      </div>
    </article>
  );
};

export default DetailViewer;