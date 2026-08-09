import type { HTMLAttributes, ReactNode } from "react";
import type { SpaceKey } from "./tokens";
import { SPACE } from "./tokens";

export interface RowProps extends HTMLAttributes<HTMLDivElement> {
  /** Gap between children, using the platform spacing scale. Default "md". */
  gap?: SpaceKey;
  /** Cross-axis (vertical) alignment of children. */
  align?: "start" | "center" | "end" | "stretch";
  /** Main-axis distribution. */
  justify?: "start" | "center" | "end" | "space-between";
  children?: ReactNode;
}

/**
 * Row — horizontal layout primitive that wraps by default rather than
 * overflowing (spec requirement #9: avoid accidental horizontal scroll
 * from oversized flex children). Use for toolbars, inline field groups,
 * and horizontally-arranged content that must remain usable on small
 * mobile widths.
 */
export function Row({
  gap = "md",
  align = "center",
  justify = "start",
  style,
  className,
  children,
  ...rest
}: RowProps) {
  return (
    <div
      className={["oba-row oba-overflow-guard", className].filter(Boolean).join(" ")}
      style={{
        gap: SPACE[gap],
        alignItems: alignToCss(align),
        justifyContent: justifyToCss(justify),
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

function alignToCss(align: RowProps["align"]): string {
  switch (align) {
    case "start":
      return "flex-start";
    case "end":
      return "flex-end";
    case "stretch":
      return "stretch";
    default:
      return "center";
  }
}

function justifyToCss(justify: RowProps["justify"]): string {
  switch (justify) {
    case "center":
      return "center";
    case "end":
      return "flex-end";
    case "space-between":
      return "space-between";
    default:
      return "flex-start";
  }
}
