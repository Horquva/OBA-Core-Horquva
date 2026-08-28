import type { ComponentType } from 'react';
import { Agent } from '../../types';
import { Users, AlertTriangle, UserMinus, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';

interface OwnershipOverviewProps {
  agents: Agent[];
  /** Owner names flagged by the backend's isHumanSpof (>=3 unbacked agents,
   *  GET /api/ownership) -- the one canonical definition, replacing this
   *  component's own independently-coded >=3 threshold. */
  humanSpofOwners: Set<string>;
}

interface KpiCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: ComponentType<{ className?: string }>;
  colorClass?: string;
  delayClass: string;
  borderClass: string;
  bgGlowClass: string;
  iconBgClass: string;
  iconTextClass: string;
  glowColor?: string;
}

function KpiCard({
  title, value, subtitle, icon: Icon, colorClass, delayClass, borderClass, bgGlowClass, iconBgClass, iconTextClass, glowColor
}: KpiCardProps) {
  return (
    <div className={clsx("card p-6 animate-fade-up relative overflow-hidden group border-t", delayClass, borderClass)}>
      <div className={clsx("absolute top-0 right-0 w-32 h-32 blur-3xl -mr-10 -mt-10 pointer-events-none", bgGlowClass)} />
      {glowColor && (
        <div className={clsx("absolute inset-0 bg-gradient-to-br to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500", glowColor)} />
      )}
      <div className="flex items-center text-[color:var(--text-secondary)] mb-3 relative">
        <div className={clsx("w-7 h-7 rounded-md border flex items-center justify-center mr-3", iconBgClass)}>
          <Icon className={clsx("w-3.5 h-3.5", iconTextClass)} />
        </div>
        <span className={clsx("text-[13px] font-semibold tracking-wide uppercase", colorClass || "text-[color:var(--text-secondary)]")}>{title}</span>
      </div>
      <div className="flex items-end justify-between mt-2 relative">
        <div className="text-4xl font-light tracking-tight text-[color:var(--text-primary)]">{value}</div>
        {subtitle && <div className={clsx("text-xs font-medium pb-1", colorClass || "text-[color:var(--text-tertiary)]")}>{subtitle}</div>}
      </div>
    </div>
  );
}

export function OwnershipOverview({ agents, humanSpofOwners }: OwnershipOverviewProps) {
  const owners = new Set(agents.map(a => a.owner).filter(Boolean));
  const totalOwners = owners.size;

  const orphanedCount = agents.filter(a => !a.owner).length;

  const coverageGaps = agents.filter(a => !a.owner || !a.backup_owner).length;

  const humanSPOFs = humanSpofOwners.size;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
      <KpiCard
        title="Total Owners"
        value={totalOwners}
        icon={Users}
        delayClass=""
        borderClass="border-t-[var(--border-strong)]"
        bgGlowClass="bg-indigo-500/0"
        glowColor="from-indigo-500/[0.03]"
        iconBgClass="bg-[var(--bg-hover)] border-[var(--border-default)]"
        iconTextClass="text-indigo-400"
      />
      <KpiCard
        title="Coverage Gaps"
        value={coverageGaps}
        subtitle="Missing primary or backup"
        icon={ShieldAlert}
        delayClass="delay-100"
        borderClass="border-t-amber-500/20"
        bgGlowClass="bg-amber-500/10"
        iconBgClass="bg-amber-500/10 border-amber-500/20"
        iconTextClass="text-amber-400"
      />
      <KpiCard
        title="Human SPOFs"
        value={humanSPOFs}
        subtitle="3+ agents w/o backup"
        icon={AlertTriangle}
        colorClass="text-red-400/80"
        delayClass="delay-200"
        borderClass="border-t-red-500/30 shadow-[inset_0_1px_20px_rgba(239,68,68,0.03)]"
        bgGlowClass="bg-red-500/10"
        iconBgClass="bg-red-500/10 border-red-500/20"
        iconTextClass="text-red-400"
      />
      <KpiCard
        title="Orphaned Agents"
        value={orphanedCount}
        subtitle="No owner assigned"
        icon={UserMinus}
        colorClass="text-orange-400/80"
        delayClass="delay-300"
        borderClass="border-t-orange-500/20"
        bgGlowClass="bg-orange-500/10"
        iconBgClass="bg-orange-500/10 border-orange-500/20"
        iconTextClass="text-orange-400"
      />
    </div>
  );
}
