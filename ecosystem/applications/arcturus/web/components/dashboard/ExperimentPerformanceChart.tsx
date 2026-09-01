"use client";

import { useExperimentPerformance } from "../../hooks/useDashboardData";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import SectionHeader from "../ui/SectionHeader";
import { Loader2 } from "lucide-react";

export default function ExperimentPerformanceChart({ experimentId }: { experimentId?: string }) {
  const { data, loading } = useExperimentPerformance(experimentId);

  if (loading) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 shadow-sm flex items-center justify-center h-80">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-primary)]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 shadow-sm flex items-center justify-center h-80 text-sm text-slate-500">
        Select an active experiment to view performance metrics.
      </div>
    );
  }

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 shadow-sm">
      <SectionHeader title="Engine Performance" description="Throughput and latency over time" />
      
      <div className="h-64 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.points} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorThroughput" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--brand-primary)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--brand-primary)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
            <XAxis dataKey="timestamp" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--card-border)' }}
              itemStyle={{ color: 'var(--foreground)' }}
            />
            <Area 
              type="monotone" 
              dataKey="throughput" 
              stroke="var(--brand-primary)" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorThroughput)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
