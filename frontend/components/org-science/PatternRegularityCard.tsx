'use client';

import { Fingerprint, AlertTriangle } from 'lucide-react';

export function PatternRegularityCard() {
  return (
    <div className="card px-6 py-8 border border-[#1f1f29] flex flex-col items-center justify-center text-center h-full min-h-[280px]">
      <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
        <AlertTriangle className="w-6 h-6 text-amber-400" />
      </div>
      <h3 className="text-white font-semibold mb-1">
        PatternRegularity not yet connected
      </h3>
      <p className="text-sm text-slate-400 max-w-sm mb-4">
        Pending backend wiring (M37). Organizational rhythm and execution pattern analysis is currently offline.
      </p>
      <div className="px-4 py-2.5 rounded-lg bg-[#111116] border border-[#1f1f29] w-full max-w-xs">
        <p className="text-xs text-slate-500">
          Ready to receive data once the M37 module is mounted on the backend.
        </p>
      </div>
    </div>
  );
}
