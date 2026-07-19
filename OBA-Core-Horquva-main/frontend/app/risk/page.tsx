import { getDataset } from '../../lib/data';
import { computeRiskIntelligence } from '../../lib/riskIntelligence';
import { RiskHeader } from '../../components/risk/RiskHeader';
import { CriticalRiskPanel } from '../../components/risk/CriticalRiskPanel';
import { RiskScoreTable } from '../../components/risk/RiskScoreTable';
import { OrgHealthBanner } from '../../components/risk/OrgHealthBanner';

export default function RiskPage() {
  const dataset = getDataset();
  const report = computeRiskIntelligence(dataset.agents, dataset.dependencies);

  return (
    <div className="space-y-8 pb-12">
      {/* Module header + OHS gauge + stat row */}
      <RiskHeader report={report} />

      {/* Critical agents — detailed expandable cards */}
      <CriticalRiskPanel criticalAgents={report.criticalAgents} />

      {/* High-risk agents table */}
      <RiskScoreTable
        agents={report.highAgents}
        title="High Risk Agents"
        subtitle="Score ≥ 40 — Escalate to department heads"
        tier="HIGH"
      />

      {/* Medium risk */}
      <RiskScoreTable
        agents={report.mediumAgents}
        title="Medium Risk Agents"
        subtitle="Score ≥ 20 — Monitor and schedule review"
        tier="MEDIUM"
      />

      {/* Low risk */}
      <RiskScoreTable
        agents={report.lowAgents}
        title="Low Risk Agents"
        subtitle="Score < 20 — Well-governed, continue maintaining"
        tier="LOW"
      />

      {/* Organizational Health Summary & key findings */}
      <OrgHealthBanner report={report} />
    </div>
  );
}
