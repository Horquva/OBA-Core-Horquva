import type { SyntheticArtifact } from '../../lib/types';
import Card from '../ui/Card';

export default function EvidenceTable({ artifacts, provisional = true }: { artifacts: SyntheticArtifact[]; provisional?: boolean }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-200 p-5">
        <h2 className="font-semibold text-slate-950">Simulation artifacts</h2>
        {provisional && <p className="mt-1 text-xs text-amber-800">Provisional corpus preview. Validation and complete lineage are not available from the current API.</p>}
      </div>
      {artifacts.length === 0 ? (
        <p className="p-5 text-sm text-slate-600">No simulation artifacts are available.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-5 py-3">Artifact</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Lifecycle</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {artifacts.map((artifact) => <tr key={artifact.artifact_id}><td className="break-all px-5 py-3 font-mono text-xs">{artifact.artifact_id}</td><td className="px-5 py-3">{artifact.artifact_type}</td><td className="px-5 py-3">{artifact.lifecycle_state}</td></tr>)}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
