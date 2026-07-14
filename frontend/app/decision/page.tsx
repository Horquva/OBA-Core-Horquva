import { getDataset } from '../../lib/data';
import { computeDecisionIntelligence } from '../../lib/decisionIntelligence';
import { DecisionHeader } from '../../components/decision/DecisionHeader';
import { CriticalDecisionsPanel } from '../../components/decision/CriticalDecisionsPanel';
import { DecisionTrailTable } from '../../components/decision/DecisionTrailTable';

export default function DecisionPage() {
  const dataset = getDataset();
  const report = computeDecisionIntelligence(
    dataset.agents,
    dataset.workflows,
    dataset.ai_tools,
  );

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      {/* Module header: DQI gauge + KPI strip */}
      <DecisionHeader report={report} />

      {/* HARMFUL + POOR decisions side-by-side */}
      <CriticalDecisionsPanel harmful={report.harmful} poor={report.poor} />

      {/* Full decision trail audit table */}
      <DecisionTrailTable decisions={report.decisions} />
    </div>
  );
}
