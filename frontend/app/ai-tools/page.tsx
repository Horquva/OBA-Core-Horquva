import { getDataset } from '../../lib/data';
import { computeAIToolIntelligence } from '../../lib/aiToolIntelligence';
import { AIToolHeader } from '../../components/ai-tools/AIToolHeader';
import { CriticalToolPanel } from '../../components/ai-tools/CriticalToolPanel';
import { ToolRiskTable } from '../../components/ai-tools/ToolRiskTable';
import { OutageImpactPanel } from '../../components/ai-tools/OutageImpactPanel';
import { DeptExposureTable } from '../../components/ai-tools/DeptExposureTable';

export default function AIToolsPage() {
  const dataset = getDataset();
  const report = computeAIToolIntelligence(dataset.ai_tools, dataset.workflows, dataset.agents);

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      {/* Module header + KPI strip */}
      <AIToolHeader report={report} />

      {/* Critical tools — expandable detail cards */}
      <CriticalToolPanel criticalTools={report.criticalTools} />

      {/* High-risk tools table */}
      {report.highTools.length > 0 && (
        <ToolRiskTable
          tools={report.highTools}
          title="High Risk Tools"
          subtitle="Score ≥ 45 — Escalate to department heads and assign backup alternatives"
          tier="HIGH"
        />
      )}

      {/* Medium-risk tools table */}
      {report.mediumTools.length > 0 && (
        <ToolRiskTable
          tools={report.mediumTools}
          title="Medium Risk Tools"
          subtitle="Score ≥ 20 — Document policies and schedule usage reviews"
          tier="MEDIUM"
        />
      )}

      {/* Low-risk tools table */}
      {report.lowTools.length > 0 && (
        <ToolRiskTable
          tools={report.lowTools}
          title="Low Risk Tools"
          subtitle="Score < 20 — Well-governed, continue monitoring"
          tier="LOW"
        />
      )}

      {/* Outage simulation — what breaks if each tool goes offline */}
      <OutageImpactPanel outageImpacts={report.outageImpacts} />

      {/* Department exposure breakdown */}
      <DeptExposureTable
        deptExposure={report.deptExposure}
        totalMonthlySpend={report.totalMonthlySpend}
      />
    </div>
  );
}
