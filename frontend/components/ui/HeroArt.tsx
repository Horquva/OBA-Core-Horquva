import * as React from 'react';
import { cn } from '@/lib/cn';

export interface HeroArtProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'banner' | 'spot' | 'subtle';
}

export function HeroArt({ variant = 'subtle', className, ...props }: HeroArtProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('relative overflow-hidden pointer-events-none select-none', className)}
      {...props}
    >
      <svg
        className="w-full h-full text-bronze/20 dark:text-amber/15"
        viewBox="0 0 400 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient
            id="hero-glow"
            cx="50%"
            cy="50%"
            r="50%"
            fx="50%"
            fy="50%"
          >
            <stop offset="0%" stopColor="var(--amber)" stopOpacity="0.25" />
            <stop offset="60%" stopColor="var(--bronze)" stopOpacity="0.08" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Soft Background Radial Aura */}
        <circle cx="200" cy="100" r="100" fill="url(#hero-glow)" />

        {/* Architectural Topological Ribbon Contours */}
        <path
          d="M20 150C80 50 160 170 200 90C240 10 320 140 380 70"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <path
          d="M40 170C100 70 180 190 220 110C260 30 340 160 400 90"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.6"
        />
        <circle cx="200" cy="90" r="4" fill="var(--amber)" opacity="0.8" />
        <circle cx="220" cy="110" r="3" fill="var(--bronze)" opacity="0.6" />
      </svg>
    </div>
  );
}
