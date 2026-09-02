import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, ElementType, ReactElement } from "react";

export interface BoxOwnProps {
  /** Element/component to render as. Defaults to "div". */
  as?: ElementType;
  /** Opt out of the horizontal-overflow guard for this box. Off by default rarely needed. */
  disableOverflowGuard?: boolean;
}

export type BoxProps<T extends ElementType = "div"> = BoxOwnProps &
  Omit<ComponentPropsWithoutRef<T>, keyof BoxOwnProps>;

/**
 * Box — the base layout primitive. Every other primitive in this package
 * (Stack, Row, Cluster, Container, Grid) is a thin, opinionated wrapper
 * around Box. Applies the overflow guard (max-width: 100%, no accidental
 * horizontal scroll) by default per spec requirement #9.
 */
export const Box = forwardRef(function Box<T extends ElementType = "div">(
  { as, disableOverflowGuard, className, ...rest }: BoxProps<T>,
  ref: React.Ref<Element>,
) {
  const Component = as || "div";
  const guardClass = disableOverflowGuard ? "" : "oba-overflow-guard";
  const combined = [guardClass, className].filter(Boolean).join(" ");
  return <Component ref={ref} className={combined || undefined} {...rest} />;
}) as <T extends ElementType = "div">(props: BoxProps<T> & { ref?: React.Ref<Element> }) => ReactElement | null;
