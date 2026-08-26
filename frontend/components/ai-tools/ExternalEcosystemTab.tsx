'use client';

import React, { useMemo, useState } from 'react';
import { TruthBadge } from '../dashboard/TruthBadge';
import { Globe, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { AITool } from '../../types';
import { ToolRiskProfile, ToolRiskTier } from '../../lib/aiToolIntelligence';

interface Props {
  /** Per-tool profiles from computeAIToolIntelligence() -- the same scoring
   *  ToolRiskTable/CriticalToolPanel use, so a tool can't show a different
   *  risk tier here than it does elsewhere on this page. Previously this
   *  component ran its own deriveVendorRisk() rule cascade independently. */
  profiles: ToolRiskProfile[];
}

const RISK_META = {
  CRITICAL: { label: 'Critical', color: 'text-red-400 bg-red-500/10 border-red-500/20',     bar: 'bg-red-400' },
  HIGH:     { label: 'High',     color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', bar: 'bg-amber-400' },
  MEDIUM:   { label: 'Medium',   color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', bar: 'bg-yellow-400' },
  LOW:      { label: 'Low',      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', bar: 'bg-emerald-400' },
};

function vendorEmoji(vendor: string): string {
  const v = vendor.toLowerCase();
  if (v.includes('openai') || v.includes('gpt'))        return '🤖';
  if (v.includes('anthropic') || v.includes('claude'))   return '🧠';
  if (v.includes('google') || v.includes('gemini'))      return '✨';
  if (v.includes('github') || v.includes('copilot'))     return '🐙';
  if (v.includes('supabase'))                            return '⚡';
  if (v.includes('stripe'))                              return '💳';
  if (v.includes('slack'))                               return '💬';
  if (v.includes('aws') || v.includes('amazon'))        return '☁️';
  if (v.includes('azure') || v.includes('microsoft'))   return '🪟';
  return '🔧';
}

export function ExternalEcosystemTab({ profiles }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'no-alternative'>('ALL');
  const tools = useMemo(() => profiles.map(p => p.tool), [profiles]);

  // Group by vendor — one card per unique vendor, aggregating their tools.
  //
  // D-68: "Org concentration" used to be
  // `agents_using.length*12 + departments.length*8` (+6 per merged tool),
  // capped at 100 -- three constants with no stated basis, the same
  // fabricated-number pattern already fixed elsewhere (D-54/D-58/D-63). It's
  // now this vendor's real share of the org's total agent-tool usage: sum of
  // `agents_using.length` across the vendor's tools, divided by that same
  // sum across every tool -- a genuine ratio over real counts already on
  // `profiles`, no invented weights, matching `knowledgeConcentration()`'s
  // own share-of-total methodology (D-59).
  const vendors = useMemo(() => {
    const totalAgentLinks = profiles.reduce((sum, p) => sum + p.tool.agents_using.length, 0);

    const vendorMap = new Map<string, {
      id: string;
      name: string;
      category: string;
      logo: string;
      hasAlternative: boolean;
      riskLevel: ToolRiskTier;
      monthlySpend: number;
      agentLinks: number;
      tools: AITool[];
    }>();

    for (const profile of profiles) {
      const tool = profile.tool;
      const vendorKey = tool.vendor || 'Unknown Vendor';
      if (!vendorMap.has(vendorKey)) {
        vendorMap.set(vendorKey, {
          id: vendorKey.toLowerCase().replace(/\s+/g, '_'),
          name: vendorKey,
          category: tool.category || 'General',
          logo: vendorEmoji(vendorKey),
          hasAlternative: Boolean(tool.backup_tool),
          riskLevel: profile.tier,
          monthlySpend: tool.monthly_cost_usd,
          agentLinks: tool.agents_using.length,
          tools: [tool],
        });
      } else {
        const entry = vendorMap.get(vendorKey)!;
        entry.monthlySpend += tool.monthly_cost_usd;
        entry.tools.push(tool);
        entry.agentLinks += tool.agents_using.length;
        // Escalate risk if any tool from that vendor is more severe
        const order = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
        if (order.indexOf(profile.tier) > order.indexOf(entry.riskLevel)) {
          entry.riskLevel = profile.tier;
        }
        // If any tool has a backup, the vendor is considered alternatives-available
        if (tool.backup_tool) entry.hasAlternative = true;
      }
    }

    return Array.from(vendorMap.values())
      .map((v) => ({
        ...v,
        concentrate: totalAgentLinks > 0 ? Math.round((v.agentLinks / totalAgentLinks) * 100) : 0,
      }))
      .sort((a, b) => {
        const order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
        return order.indexOf(a.riskLevel) - order.indexOf(b.riskLevel);
      });
  }, [profiles]);

  const noAlternative = vendors.filter(v => !v.hasAlternative);
  const displayed = filter === 'no-alternative' ? noAlternative : vendors;

  const totalSpend = vendors.reduce((s, v) => s + v.monthlySpend, 0);
  const criticalCount = vendors.filter(v => v.riskLevel === 'CRITICAL').length;

  if (tools.length === 0) {
    return (
      <div className="flex flex-col rounded-xl bg-[color:var(--bg-elevated)] border border-[color:var(--border-subtle)] p-12 text-center">
        <Globe className="w-8 h-8 text-[color:var(--text-tertiary)] mx-auto mb-3" />
        <p className="text-sm text-[color:var(--text-tertiary)]">No vendor data available — add AI tools to begin ecosystem mapping.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-xl bg-[color:var(--bg-elevated)] border border-[color:var(--border-subtle)] p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-72 h-72 bg-sky-500/5 rounded-full blur-3xl pointer-events-none -translate-x-1/3 -translate-y-1/3" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 z-10">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-sky-400" />
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">External Vendor Ecosystem</h2>
          </div>
          <p className="text-sm text-[color:var(--text-secondary)] mt-1">Vendor map, supported assets, and single-vendor concentration flags</p>
        </div>
        {/* profile.tier (computeAIToolIntelligence) is a local heuristic with
            no backend equivalent -- not something to badge as verified. */}
        <TruthBadge verified={false} />
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4 mb-6 z-10">
        <div className="flex flex-col p-4 rounded-lg bg-[color:var(--bg-card)] border border-[color:var(--border-subtle)]">
          <span className="text-xs text-[color:var(--text-tertiary)] uppercase tracking-wider">Monthly Spend</span>
          <span className="text-2xl font-bold text-[color:var(--text-primary)] mt-1">${totalSpend.toLocaleString()}</span>
          <span className="text-xs text-[color:var(--text-tertiary)] mt-0.5">across {vendors.length} vendor{vendors.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex flex-col p-4 rounded-lg bg-red-500/5 border border-red-500/20">
          <span className="text-xs text-red-400/70 uppercase tracking-wider">Critical Vendors</span>
          <span className="text-2xl font-bold text-red-400 mt-1">{criticalCount}</span>
          <span className="text-xs text-red-400/60 mt-0.5">require immediate mitigation</span>
        </div>
        <div className="flex flex-col p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
          <span className="text-xs text-amber-400/70 uppercase tracking-wider">No Alternative</span>
          <span className="text-2xl font-bold text-amber-400 mt-1">{noAlternative.length}</span>
          <span className="text-xs text-amber-400/60 mt-0.5">vendors with zero fallback</span>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6 z-10">
        {(['ALL', 'no-alternative'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              filter === f
                ? 'text-sky-400 bg-sky-500/10 border-sky-500/30'
                : 'text-[color:var(--text-secondary)] bg-[color:var(--bg-card)] border-[color:var(--border-subtle)] hover:text-[color:var(--text-primary)]'
            }`}
          >
            {f === 'ALL' ? `All Vendors (${vendors.length})` : `⚠ No Alternative (${noAlternative.length})`}
          </button>
        ))}
      </div>

      {/* Vendor grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 z-10">
        {displayed.map(vendor => {
          const meta = RISK_META[vendor.riskLevel];
          const isExpanded = selected === vendor.id;

          return (
            <div
              key={vendor.id}
              onClick={() => setSelected(isExpanded ? null : vendor.id)}
              className={`flex flex-col rounded-lg border transition-all cursor-pointer ${
                isExpanded
                  ? 'border-sky-500/30 bg-sky-500/5'
                  : 'bg-[color:var(--bg-card)] border-[color:var(--border-subtle)] hover:border-sky-500/20'
              }`}
            >
              {/* Vendor header */}
              <div className="flex items-start gap-4 p-4">
                <div className="text-3xl w-10 h-10 flex items-center justify-center shrink-0 mt-0.5 select-none">{vendor.logo}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-[color:var(--text-primary)] text-sm">{vendor.name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${meta.color}`}>{meta.label}</span>
                  </div>
                  <span className="text-xs text-[color:var(--text-tertiary)]">{vendor.category}</span>
                </div>

                {!vendor.hasAlternative && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
                {vendor.hasAlternative && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
              </div>

              {/* Concentration bar */}
              <div className="px-4 pb-3">
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-[color:var(--text-tertiary)]">Org concentration</span>
                  <span className="text-[color:var(--text-secondary)] font-medium">{vendor.concentrate}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[color:var(--bg-elevated)] overflow-hidden">
                  <div className={`h-full rounded-full ${meta.bar}`} style={{ width: `${vendor.concentrate}%` }} />
                </div>
              </div>

              {/* Alternative flag */}
              <div className="px-4 pb-3">
                {vendor.hasAlternative ? (
                  <span className="text-xs text-emerald-400">✓ Backup tool configured</span>
                ) : (
                  <span className="text-xs text-amber-400 font-semibold">⚠ No alternative configured</span>
                )}
              </div>

              {/* Expanded: tool list */}
              {isExpanded && (
                <div className="border-t border-[color:var(--border-subtle)] px-4 py-3 flex flex-col gap-2">
                  <p className="text-[10px] text-[color:var(--text-tertiary)] uppercase tracking-wider mb-1">Tools from this vendor</p>
                  {vendor.tools.map((tool, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded border text-xs font-medium text-indigo-400 bg-indigo-500/10 border-indigo-500/20">
                      <span className="text-[color:var(--text-secondary)] font-normal">{tool.name}</span>
                      <span className="ml-auto text-[color:var(--text-tertiary)] capitalize">{tool.criticality}</span>
                    </div>
                  ))}
                  {vendor.monthlySpend > 0 && (
                    <div className="mt-2 pt-2 border-t border-[color:var(--border-subtle)] flex justify-between text-xs">
                      <span className="text-[color:var(--text-tertiary)]">Est. monthly spend</span>
                      <span className="font-semibold text-[color:var(--text-primary)]">${vendor.monthlySpend.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
