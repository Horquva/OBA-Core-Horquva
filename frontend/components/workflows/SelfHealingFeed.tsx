'use client';

import { Shield, AlertTriangle } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
// These mirror the selfHealing types in lib/api.ts (SelfHealingIssue,
// SelfHealingIntent). They are ready for use once the M51 backend route is
// wired up. Import them from lib/api.ts at that time:
//
//   import { selfHealing, type SelfHealingIssue } from '../../lib/api';

interface SelfHealingFeedItem {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  detectedAt: string;
}

interface SelfHealingRemediationIntent {
  issueId: string;
  action: string;
  target: string;
  status: string;
}

// ─── Component ───────────────────────────────────────────────────────────────
// /api/self-healing is NOT MOUNTED in backend/index.js (confirmed via
// EndpointHealthGrid). The component is fully laid out so it's ready to
// render real data once the backend route is live.

export function SelfHealingFeed() {
  // When M51 is wired:
  // 1. Import { selfHealing, ApiError } from '../../lib/api';
  // 2. Add state: const [issues, setIssues] = useState<SelfHealingFeedItem[]>([]);
  // 3. Add useEffect fetching selfHealing.detect()
  // 4. Render loading/empty/error/success states below

  return (
    <div className="animate-fade-up delay-500">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Shield className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Self-Healing Feed</h2>
          <p className="text-xs text-slate-400">Automated issue detection and remediation</p>
        </div>
      </div>

      {/* Not-connected state — displayed because /api/self-healing is NOT MOUNTED */}
      <div className="card px-6 py-8 border border-[#1f1f29] flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-amber-400" />
        </div>
        <h3 className="text-white font-semibold mb-1">
          Self-Healing feed not yet connected
        </h3>
        <p className="text-sm text-slate-400 max-w-md mb-4">
          Pending backend wiring (M51). The{' '}
          <span className="font-mono text-slate-500">/api/self-healing</span> endpoint is not
          mounted in <span className="font-mono text-slate-500">backend/index.js</span>.
        </p>
        <div className="px-4 py-2.5 rounded-lg bg-[#111116] border border-[#1f1f29] max-w-lg">
          <p className="text-xs text-slate-500">
            When available, this feed will display detected issues with severity-based triage and
            auto-remediation intents in real time. The component layout, types, and styling are
            fully implemented — only the data connection is pending.
          </p>
        </div>
      </div>

      {/* ── Ready-to-use templates (commented out, activate when M51 is live) ──
       *
       * Loading state:
       *   <div className="card px-6 py-5 border border-[#1f1f29]">
       *     <div className="space-y-3">
       *       {[0,1,2].map(i => (
       *         <div key={i} className="h-16 w-full rounded-lg bg-[#1f1f29] animate-pulse-soft" />
       *       ))}
       *     </div>
       *   </div>
       *
       * Empty state:
       *   <div className="card px-6 py-10 flex flex-col items-center justify-center text-center">
       *     <Shield className="w-10 h-10 text-slate-500 mb-3" />
       *     <h3 className="text-white font-semibold mb-1">No Issues Detected</h3>
       *     <p className="text-sm text-slate-400">Self-healing system reports all clear.</p>
       *   </div>
       *
       * Error state:
       *   <div className="card px-6 py-6 border border-[#1f1f29]">
       *     <div className="flex items-start gap-3">
       *       <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
       *       <div>
       *         <p className="text-sm text-white font-medium mb-1">Failed to load self-healing feed</p>
       *         <p className="text-xs text-slate-500">{errorMsg}</p>
       *       </div>
       *     </div>
       *   </div>
       *
       * Success state — issue cards:
       *   <div className="space-y-3">
       *     {issues.map(issue => (
       *       <div key={issue.id} className="px-4 py-3 rounded-lg bg-[#111116] border border-[#1f1f29]">
       *         <div className="flex items-center gap-2 mb-1">
       *           <RiskBadge level={issue.severity} />
       *           <span className="text-sm font-medium text-white">{issue.type}</span>
       *         </div>
       *         <p className="text-xs text-slate-300">{issue.description}</p>
       *         <p className="text-[10px] text-slate-500 mt-1">
       *           Detected: {new Date(issue.detectedAt).toLocaleString()}
       *         </p>
       *       </div>
       *     ))}
       *   </div>
       */}
    </div>
  );
}
