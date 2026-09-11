import React from "react";
import { statusMeta } from "../../domain/status";

export function Badge({ status, size = "md" }) {
  const meta = statusMeta(status);
  const Icon = meta.icon;
  return (
    <span className={`badge tone-${meta.tone} size-${size}`}>
      <Icon size={size === "sm" ? 11 : 13} className={meta.spin ? "spin" : ""} />
      {meta.label}
    </span>
  );
}
