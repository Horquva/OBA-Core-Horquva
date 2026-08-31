'use client';

import React from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

interface Props {
  verified: boolean;
}

export function TruthGateBadge({ verified }: Props) {
  if (verified) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 w-max" title="Verified by organizational truth data">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span className="text-[10px] font-semibold uppercase tracking-wider">Verified</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 w-max" title="Unverified decision — do not act on this">
      <ShieldAlert className="w-3.5 h-3.5" />
      <span className="text-[10px] font-semibold uppercase tracking-wider">Unverified</span>
    </div>
  );
}
