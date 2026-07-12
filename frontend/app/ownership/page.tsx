import { getDataset } from '../../lib/data';
import { OwnershipOverview } from '../../components/ownership/OwnershipOverview';
import { ConcentrationBar } from '../../components/ownership/ConcentrationBar';
import { OwnershipList } from '../../components/ownership/OwnershipList';
import { DependencyPipeline } from '../../components/ownership/DependencyPipeline';
import { HumanDependencyRisks } from '../../components/ownership/HumanDependencyRisks';
import { OrgRelationshipMap } from '../../components/ownership/OrgRelationshipMap';

export default function OwnershipPage() {
  const dataset = getDataset();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Ownership Intelligence</h1>
        <p className="text-slate-400 mt-1">Human-agent dependency map identifying single points of failure and coverage gaps.</p>
      </div>

      {/* KPI strip */}
      <OwnershipOverview agents={dataset.agents} />

      {/* Owner concentration chart */}
      <ConcentrationBar agents={dataset.agents} />

      {/* Module 06 — Human-Agent Dependency Map */}
      {/* Pipeline: People → Agents → AI Platforms → Workflows */}
      <DependencyPipeline dataset={dataset} />

      {/* Human dependency risk scorecards */}
      <HumanDependencyRisks dataset={dataset} />

      {/* Organizational relationship mapping */}
      <OrgRelationshipMap dataset={dataset} />

      {/* Detailed owner registry */}
      <OwnershipList agents={dataset.agents} />
    </div>
  );
}
