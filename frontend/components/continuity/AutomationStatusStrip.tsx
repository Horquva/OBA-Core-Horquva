'use client';

import React from 'react';
import { PlayCircle, AlertCircle, Ban } from 'lucide-react';

export function AutomationStatusStrip() {
  return (
    <div className="flex items-center gap-4 bg-[color:var(--bg-elevated)] border border-[color:var(--border-subtle)] p-4 rounded-xl mb-8 relative overflow-hidden">
       {/* Background glimmer */}
      <div className="absolute top-0 right-0 h-full w-64 bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />

      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
        <PlayCircle className="w-5 h-5 text-indigo-400" />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-[color:var(--text-primary)] leading-tight flex items-center gap-2">
          Execution Mode: <span className="text-indigo-400 font-bold uppercase tracking-wider text-xs">Advisory (Read-Only)</span>
        </h3>
        <p className="text-[11px] text-[color:var(--text-secondary)] mt-0.5 max-w-2xl truncate">
          Automated remediation Intents are being emitted by the execution engine, but writing is disabled in the MVP.
        </p>
      </div>

      <div className="hidden md:flex gap-3 text-[10px] text-[color:var(--text-secondary)] shrink-0">
        <div className="px-3 py-1.5 rounded border border-amber-500/20 bg-amber-500/10 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-amber-400 font-semibold tracking-wide uppercase">4 Pending Resolves</span>
        </div>
        <div className="px-3 py-1.5 rounded border border-red-500/20 bg-red-500/10 flex items-center gap-1.5">
          <Ban className="w-3.5 h-3.5 text-red-400" />
          <span className="text-red-400 font-semibold tracking-wide uppercase">Writes Blocked</span>
        </div>
      </div>
    </div>
  );
}
