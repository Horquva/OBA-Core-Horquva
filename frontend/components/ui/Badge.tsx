'use client';

import React from 'react';

export type StatusType = 'VALIDATED' | 'COMPLETED' | 'RUNNING' | 'INCONCLUSIVE' | 'BLOCKED' | 'REJECTED' | 'FAILED';

interface BadgeProps {
  status: StatusType | string;
  label?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, label }) => {
  const normStatus = status.toUpperCase();

  let styles = 'bg-zinc-800 text-zinc-300 border-zinc-700';
  let dotStyle = 'bg-zinc-400';

  if (normStatus === 'VALIDATED' || normStatus === 'COMPLETED') {
    styles = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    dotStyle = 'bg-emerald-400';
  } else if (normStatus === 'RUNNING') {
    styles = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    dotStyle = 'bg-cyan-400 animate-pulse';
  } else if (normStatus === 'INCONCLUSIVE' || normStatus === 'BLOCKED') {
    styles = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    dotStyle = 'bg-amber-400';
  } else if (normStatus === 'REJECTED' || normStatus === 'FAILED') {
    styles = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    dotStyle = 'bg-rose-400';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${styles}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotStyle}`} />
      {label || normStatus}
    </span>
  );
};