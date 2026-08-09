import type { HTMLAttributes, ReactNode } from "react";

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Whether horizontal padding should account for device safe-area
   * insets (notches, home indicators). Default true. Set false for
   * containers nested inside a surface that already applies safe-area
   * padding, to avoid double-padding.
   */
  safeArea?: boolean;
  children?: ReactNode;
}

/**
 * Container — the top-level responsive width constraint. Fluid width up
 * to a per-breakpoint max-width (see layout.css / tokens.ts), with
 * horizontal padding that scales per breakpoint and, by default, adds
 * device safe-area insets on top so content never sits under a notch or
 * home indicator on mobile surfaces.
 */
export function Container({ safeArea = true, className, children, ...rest }: ContainerProps) {
  const base = safeArea ? "oba-container" : "oba-container oba-container--no-safe-area";
  return (
    <div className={[base, "oba-overflow-guard", className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </div>
  );
}
