import { getDataset } from '../../lib/data';
import { computeKnowledgeRisk } from '../../lib/knowledgeRisk';
import { KnowledgeHeader } from '../../components/knowledge/KnowledgeHeader';
import { ConcentrationRiskPanel } from '../../components/knowledge/ConcentrationRiskPanel';
import { UndocumentedAssetsTable } from '../../components/knowledge/UndocumentedAssetsTable';
import { DepartureSim } from '../../components/knowledge/DepartureSim';
import { KnowledgeGapsPanel } from '../../components/knowledge/KnowledgeGapsPanel';

export default function KnowledgePage() {
  const dataset = getDataset();
  const report = computeKnowledgeRisk(
    dataset.agents,
    dataset.workflows,
    dataset.ai_tools,
  );

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      {/* Module header + KPI strip */}
      <KnowledgeHeader report={report} />

      {/* Knowledge concentration risk — per-person expandable cards */}
      <ConcentrationRiskPanel profiles={report.profiles} />

      {/* Departure impact simulator */}
      <DepartureSim profiles={report.profiles} />

      {/* Undocumented assets across all types */}
      <UndocumentedAssetsTable assets={report.undocumentedAssets} />

      {/* Critical knowledge gaps — no doc AND no backup */}
      <KnowledgeGapsPanel gaps={report.knowledgeGaps} />
    </div>
  );
}
