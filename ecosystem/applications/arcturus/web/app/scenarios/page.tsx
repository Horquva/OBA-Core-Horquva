import Card from '../../components/ui/Card';

export default function ScenariosPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-sky-700">Arcturus</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Scenarios</h1>
        <p className="mt-2 text-sm text-slate-600">Scenario Engineering & Precondition Configuration.</p>
      </div>

      <Card className="p-6">
        <h2 className="font-semibold text-slate-900">Scenario Repository</h2>
        <p className="mt-2 text-sm text-slate-600">
          Configure baseline enterprise scenarios, inject workforce parameter shifts, and setup experiment preconditions.
        </p>
        <div className="mt-4 rounded-lg bg-slate-50 p-4 border border-slate-200">
          <p className="text-xs font-mono text-slate-700">Scenario Engine: Ready (Precondition Validation Active)</p>
        </div>
      </Card>
    </div>
  );
}
