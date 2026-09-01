"use client";

import { useDashboardKpis } from "../hooks/useDashboardData";
import SectionHeader from "../components/ui/SectionHeader";
import KpiCard from "../components/ui/KpiCard";
import QuickActionsBar from "../components/dashboard/QuickActionsBar";
import SimulationPipeline from "../components/dashboard/SimulationPipeline";
import CurrentExperimentCard from "../components/dashboard/CurrentExperimentCard";
import SystemOverviewStrip from "../components/dashboard/SystemOverviewStrip";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { data: kpis, loading } = useDashboardKpis();

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold font-heading text-slate-900 tracking-tight">Command Center</h1>
        <p className="text-slate-500 mt-1">Platform overview and active simulation telemetry</p>
      </div>

      <SystemOverviewStrip />

      <QuickActionsBar />

      <section>
        <SectionHeader title="Key Performance Indicators" />
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {kpis?.map((kpi) => (
              <KpiCard key={kpi.id} metric={kpi} />
            ))}
          </div>
        )}
      </section>

      <section>
        <SimulationPipeline />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CurrentExperimentCard />
        {/* We can add another card here later, e.g., Recent Activity */}
      </section>
    </div>
  );
}