import { getDataset } from '../../lib/data';
import { computeOrgMemory } from '../../lib/orgMemory';
import { MemoryHeader } from '../../components/memory/MemoryHeader';
import { MemoryCarriersPanel } from '../../components/memory/MemoryCarriersPanel';
import { LostAssetsPanel } from '../../components/memory/LostAssetsPanel';

export default function MemoryPage() {
  const dataset = getDataset();
  const report = computeOrgMemory(
    dataset.agents,
    dataset.workflows,
    dataset.ai_tools,
  );

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      {/* Module header + KPI strip + IMHS meter */}
      <MemoryHeader report={report} />

      {/* Critical memory carriers — per-person scorecards */}
      <MemoryCarriersPanel carriers={report.carriers} />

      {/* LOST assets — no owner, no docs, no recovery */}
      <LostAssetsPanel lost={report.lost} />
    </div>
  );
}
