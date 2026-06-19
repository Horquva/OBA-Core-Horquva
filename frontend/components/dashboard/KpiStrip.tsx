import { Activity, Users, AlertTriangle, Link2 } from 'lucide-react';

export function KpiStrip() {
  const calculatedRiskScore = 72;
  const totalAgents = 15;
  const orphanedAgents = 3;
  const criticalDependencies = 5;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

      {/* Card 1 — Risk Score */}
      <div className="card p-5 flex flex-col justify-between relative overflow-hidden group animate-fade-up delay-75">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-red-500 to-red-600/40"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="flex justify-between items-center mb-4 relative z-10">
          <span className="text-sm font-medium text-slate-400">Platform Risk Score</span>
          <Activity className="w-5 h-5 text-red-400 group-hover:scale-110 transition-transform duration-200" />
        </div>
        <div className="flex items-baseline space-x-2 relative z-10 animate-count-up delay-150">
          <h3 className="text-3xl font-semibold text-white">{calculatedRiskScore}</h3>
          <span className="text-sm text-slate-500">/ 100</span>
        </div>
        <div className="mt-4 w-full bg-[#1f1f29] rounded-full h-1.5 relative z-10 overflow-hidden">
          <div
            className="bg-gradient-to-r from-red-600 to-red-400 h-1.5 rounded-full transition-all duration-700"
            style={{ width: `${calculatedRiskScore}%` }}
          ></div>
        </div>
      </div>

      {/* Card 2 — Total Agents */}
      <div className="card p-5 flex flex-col justify-between relative overflow-hidden group animate-fade-up delay-150">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-indigo-500 to-indigo-600/40"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="flex justify-between items-center mb-4 relative z-10">
          <span className="text-sm font-medium text-slate-400">Agents Found</span>
          <Users className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform duration-200" />
        </div>
        <div className="flex items-baseline space-x-2 relative z-10 animate-count-up delay-225">
          <h3 className="text-3xl font-semibold text-white">{totalAgents}</h3>
        </div>
        <p className="mt-4 text-xs text-slate-500 flex items-center relative z-10">
          <span className="text-emerald-400 mr-1">↑ 2</span> from last month
        </p>
      </div>

      {/* Card 3 — Orphaned Agents */}
      <div className="card p-5 flex flex-col justify-between relative overflow-hidden group animate-fade-up delay-225">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-amber-400 to-amber-500/40"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-amber-400/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="flex justify-between items-center mb-4 relative z-10">
          <span className="text-sm font-medium text-slate-400">Orphaned Agents</span>
          <AlertTriangle className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform duration-200 animate-pulse-soft" />
        </div>
        <div className="flex items-baseline space-x-2 relative z-10 animate-count-up delay-300">
          <h3 className="text-3xl font-semibold text-white">{orphanedAgents}</h3>
        </div>
        <p className="mt-4 text-xs text-amber-500/70 flex items-center relative z-10">
          Requires immediate assignment
        </p>
      </div>

      {/* Card 4 — Critical Dependencies */}
      <div className="card p-5 flex flex-col justify-between relative overflow-hidden group animate-fade-up delay-300">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-blue-400 to-blue-500/40"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-blue-400/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="flex justify-between items-center mb-4 relative z-10">
          <span className="text-sm font-medium text-slate-400">Critical Dependencies</span>
          <Link2 className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform duration-200" />
        </div>
        <div className="flex items-baseline space-x-2 relative z-10 animate-count-up delay-300">
          <h3 className="text-3xl font-semibold text-white">{criticalDependencies}</h3>
        </div>
        <p className="mt-4 text-xs text-slate-500 flex items-center relative z-10">
          High impact connections
        </p>
      </div>

    </div>
  );
}
