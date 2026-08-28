import type { ExecutionStatus } from '../../lib/types';

const stages: Array<{ status: ExecutionStatus; label: string }> = [
  { status: 'CREATED', label: 'Created' },
  { status: 'INITIALIZING', label: 'Initializing' },
  { status: 'RUNNING', label: 'Running' },
  { status: 'PAUSED', label: 'Paused' },
  { status: 'COMPLETED', label: 'Completed' },
];

export default function ExperimentTimeline({ status }: { status: ExecutionStatus }) {
  const isTerminal = status === 'FAILED' || status === 'BLOCKED';

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4" aria-label="Experiment lifecycle">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Experiment lifecycle</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {stages.map((stage, index) => (
          <div key={stage.status} className="flex items-center gap-2">
            <span className={`rounded-md px-2 py-1 text-xs ${stage.status === status ? 'bg-sky-700 font-semibold text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}>
              {stage.label}
            </span>
            {index < stages.length - 1 && <span className="text-slate-300" aria-hidden="true">/</span>}
          </div>
        ))}
      </div>
      {isTerminal && <p className="mt-3 text-xs text-slate-600">The backend reports this execution as {status.toLowerCase()}; no successful completion is implied.</p>}
    </div>
  );
}