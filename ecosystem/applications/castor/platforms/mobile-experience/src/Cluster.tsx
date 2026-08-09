import type { HTMLAttributes, ReactNode } from "react";
import type { SpaceKey } from "./tokens";
import { SPACE } from "./tokens";

export interface ClusterProps extends HTMLAttributes<HTMLDivElement> {
  /** Gap between items, using the platform spacing scale. Default "sm". */
  gap?: SpaceKey;
  children?: ReactNode;
}

/**
 * Cluster — a wrapping group of same-priority items with a consistent
 * gap in both axes (tags, chips, filter pills, action buttons). Unlike
 * Row, Cluster does not enforce a single main-axis alignment convention
 * since items are expected to wrap onto multiple lines at small widths.
 */
export function Cluster({ gap = "sm", style, className, children, ...rest }: ClusterProps) {
  return (
    <div
      className={["oba-cluster oba-overflow-guard", className].filter(Boolean).join(" ")}
      style={{ gap: SPACE[gap], ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}
