import React from "react";

export function ViewHead({ title, subtitle, right }) {
  return (
    <div className="view-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
