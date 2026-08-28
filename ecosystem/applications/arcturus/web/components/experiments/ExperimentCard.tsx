import Link from 'next/link';
import type { ExperimentRecord } from '../../lib/types';
import Card from '../ui/Card';
import StatusIndicator from '../ui/StatusIndicator';

function formatDate(value?: string | null) {
  if (!value) return 'Not available';
  return new Date(value).toLocaleString();
}

export default function ExperimentCard({ experiment }: { experiment: ExperimentRecord }) {
  return (
    <Card className="p-5 transition hover:border-sky-300 hover:shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-950">{experiment.name}</h2>
            <StatusIndicator status={experiment.status} />
          </div>
          <p className="mt-2 break-all font-mono text-xs text-slate-500">{experiment.id}</p>
          <dl className="mt-4 grid grid-cols-1 gap-2 text-sm text-slate-600 sm:grid-cols-3">
            <div><dt className="text-xs uppercase tracking-wide text-slate-400">Seed</dt><dd>{experiment.seed}</dd></div>
            <div><dt className="text-xs uppercase tracking-wide text-slate-400">Scenario</dt><dd>{experiment.config.scenario_id || 'Not specified'}</dd></div>
            <div><dt className="text-xs uppercase tracking-wide text-slate-400">Created</dt><dd>{formatDate(experiment.created_at)}</dd></div>
          </dl>
        </div>
        <Link href={`/experiments/${experiment.id}`} className="shrink-0 text-sm font-semibold text-sky-700 hover:text-sky-900">
          View details
        </Link>
      </div>
    </Card>
  );
}