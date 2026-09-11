import React from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

export function ActionDialog({ title, subtitle, children, onClose, onSubmit, submitLabel = "Save", disabled = false }) {
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label={title}>
        <div className="dialog-head">
          <div><h3>{title}</h3>{subtitle && <p className="muted">{subtitle}</p>}</div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Close"><X size={17}/></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
          <div className="dialog-body">{children}</div>
          <div className="dialog-actions">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={disabled}>{submitLabel}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
