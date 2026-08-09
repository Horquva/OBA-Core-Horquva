import type { HTMLAttributes, ReactNode } from "react";
import type { SpaceKey } from "./tokens";
import { SPACE } from "./tokens";

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  /** Gap between children, using the platform spacing scale. Default "md". */
  gap?: SpaceKey;
  /** Cross-axis (horizontal) alignment of children. */
  align?: "start" | "center" | "end" | "stretch";
  children?: ReactNode;
}

/**
 * Stack — vertical layout primitive with consistent, token-based rhythm
 * between children. Use for any top-to-bottom composition (form fields,
 * card content, page sections) instead of ad-hoc margin-bottom chains.
 */
export function Stack({ gap = "md", align = "stretch", style, className, children, ...rest }: StackProps) {
  return (
    <div
      className={["oba-stack oba-overflow-guard", className].filter(Boolean).join(" ")}
      style={{ gap: SPACE[gap], alignItems: alignToCss(align), ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}

function alignToCss(align: StackProps["align"]): string {
  switch (align) {
    case "start":
      return "flex-start";
    case "center":
      return "center";
    case "end":
      return "flex-end";
    default:
      return "stretch";
  }
}
