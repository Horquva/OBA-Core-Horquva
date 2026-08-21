import React from "react";

export function Panel({ title, subtitle, right, children, className = "" }) {
  return (
    <section className={`panel ${className}`}>
      {(title || right) && (
        <header className="panel-head">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <p className="muted">{subtitle}</p>}
          </div>
          {right}
        </header>
      )}
      <div className="panel-body">{children}</div>
    </section>
  );
}
