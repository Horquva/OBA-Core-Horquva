import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import type { BreakpointKey } from "./breakpoints";

export type GridColumns = Partial<Record<BreakpointKey, number>>;

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Column count per breakpoint. Unspecified breakpoints fall back to the
   * CSS defaults in layout.css (1 / 2 / 3 / 4 for small mobile / large
   * mobile / tablet / desktop) so callers only override what differs from
   * the deterministic default.
   */
  columns?: GridColumns;
  children?: ReactNode;
}

const CSS_VAR_BY_BREAKPOINT: Record<BreakpointKey, string> = {
  smallMobile: "--oba-grid-columns-small-mobile",
  largeMobile: "--oba-grid-columns-large-mobile",
  tablet: "--oba-grid-columns-tablet",
  desktop: "--oba-grid-columns-desktop",
};

/**
 * Grid — adaptive grid with deterministic, explicit column counts per
 * device class (spec requirement #4), rather than an auto-fit/minmax
 * layout whose column count depends on unpredictable item widths.
 * Column switching happens purely in CSS via media queries — no resize
 * listener is used.
 */
export function Grid({ columns, style, className, children, ...rest }: GridProps) {
  const columnVars: CSSProperties = {};
  if (columns) {
    for (const key of Object.keys(columns) as BreakpointKey[]) {
      const value = columns[key];
      if (typeof value === "number") {
        (columnVars as Record<string, string | number>)[CSS_VAR_BY_BREAKPOINT[key]] = value;
      }
    }
  }

  return (
    <div
      className={["oba-grid oba-overflow-guard", className].filter(Boolean).join(" ")}
      style={{ ...columnVars, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}
