'use client';

import { KpiStrip } from '../components/dashboard/KpiStrip';
import { Heatmap } from '../components/dashboard/Heatmap';
import { RiskSplit } from '../components/dashboard/RiskSplit';
import { AgentTable } from '../components/dashboard/AgentTable';
import { VerdictBanner } from '../components/dashboard/VerdictBanner';
import { FivePillarsRadar } from '../components/dashboard/FivePillarsRadar';
import { DailyBriefingCard } from '../components/dashboard/DailyBriefingCard';
import { WhatMattersNowFeed } from '../components/dashboard/WhatMattersNowFeed';
import { ExecutiveMemoryPanel } from '../components/dashboard/ExecutiveMemoryPanel';
import { EarlyWarningStrip } from '../components/dashboard/EarlyWarningStrip';

export default function DashboardPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="mb-2 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gradient tracking-tight">
            Executive Command Center
          </h1>
          <p className="text-[color:var(--text-secondary)] mt-1 text-sm">
            Real-time organizational intelligence — state of the organization, top to bottom.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shrink-0"
          style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }}>
          <span className="live-dot" /> Live
        </span>
      </div>

      {/* Row 1: The Verdict & KPIs */}
      <VerdictBanner />
      <KpiStrip />

      {/* Row 2: Bento Grid (Intelligence & Feed) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (8 cols): Early Warning + Radar + Briefing */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <EarlyWarningStrip />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
            <FivePillarsRadar />
            <DailyBriefingCard />
          </div>
        </div>

        {/* Right Column (4 cols): Live Feed */}
        <div className="lg:col-span-4 h-full flex flex-col" style={{ minHeight: '100%' }}>
          <div className="flex-1 h-full">
            <WhatMattersNowFeed />
          </div>
        </div>
      </div>

      {/* Row 3: Memory & Context */}
      <ExecutiveMemoryPanel />

      <div className="flex items-center gap-3 pt-6 pb-2 opacity-50">
        <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
        <span className="text-[10px] uppercase tracking-widest text-[color:var(--text-tertiary)] font-medium px-2">
          Operational Diagnostics
        </span>
        <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
      </div>

      {/* Row 4: Deep Diagnostics */}
      <div className="space-y-6">
        <RiskSplit />
        <Heatmap />
        <AgentTable />
      </div>
    </div>
  );
}
