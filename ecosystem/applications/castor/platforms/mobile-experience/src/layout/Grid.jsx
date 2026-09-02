import React from 'react';
import './layout.css';

/**
 * Grid — adaptive column grid that collapses column count by breakpoint.
 * Ref: specs/01-responsive-layout-infrastructure.md §3
 *
 * Props:
 *   cols: { xs?: number, sm?: number, md?: number, lg?: number, xl?: number }
 *   gap: spacing token key ('xs'|'sm'|'md'|'lg') — defaults to 'md'
 *
 * Example: <Grid cols={{ xs: 1, sm: 2, md: 3, lg: 4 }}>...</Grid>
 */
const GAP_MAP = { xs: 4, sm: 8, md: 16, lg: 24 };

export function Grid({ cols = { xs: 1, md: 2, lg: 3 }, gap = 'md', className = '', children, ...rest }) {
  const style = {
    '--cx-grid-cols-xs': cols.xs ?? 1,
    '--cx-grid-cols-sm': cols.sm ?? cols.xs ?? 1,
    '--cx-grid-cols-md': cols.md ?? cols.sm ?? cols.xs ?? 2,
    '--cx-grid-cols-lg': cols.lg ?? cols.md ?? 3,
    '--cx-grid-cols-xl': cols.xl ?? cols.lg ?? cols.md ?? 3,
    '--cx-grid-gap': `${GAP_MAP[gap] ?? GAP_MAP.md}px`,
  };

  return (
    <div className={['cx-grid', className].filter(Boolean).join(' ')} style={style} {...rest}>
      {children}
    </div>
  );
}

export default Grid;
