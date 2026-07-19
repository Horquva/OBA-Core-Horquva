import { getDataset } from '../lib/data';
import { KpiStrip } from '../components/dashboard/KpiStrip';
import { Heatmap } from '../components/dashboard/Heatmap';
import { RiskSplit } from '../components/dashboard/RiskSplit';
import { AgentTable } from '../components/dashboard/AgentTable';

export default function DashboardPage() {
  const dataset = getDataset();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Executive Dashboard</h1>
        <p className="text-slate-400 mt-1">Real-time organizational snapshot of AI workforce risk, ownership, and continuity.</p>
      </div>

      {/* 01 Organizational Snapshot */}
      <KpiStrip />

      {/* 02 Risk Analysis */}
      <Heatmap agents={dataset.agents} />

      {/* 03 Recommendations */}
      <RiskSplit agents={dataset.agents} workflows={dataset.workflows} />

      {/* 04 Agent Summary */}
      <AgentTable agents={dataset.agents} />
      
    </div>
  );
}
