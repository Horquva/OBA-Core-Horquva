import Card from '../ui/Card';

export default function StateViewer({ state }: { state?: Record<string, unknown> }) {
  const entries = Object.entries(state || {});

  return (
    <Card className="p-5">
      <h2 className="font-semibold text-slate-950">Current state</h2>
      {entries.length === 0 ? (
        <p className="mt-5 text-sm text-slate-600">No state snapshot has been received.</p>
      ) : (
        <dl className="mt-4 space-y-3">
          {entries.map(([key, value]) => (
            <div key={key} className="flex flex-col gap-1 border-b border-slate-100 pb-2 sm:flex-row sm:justify-between">
              <dt className="text-sm text-slate-500">{key}</dt>
              <dd className="break-all text-sm font-medium text-slate-800">{String(value)}</dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  );
}
