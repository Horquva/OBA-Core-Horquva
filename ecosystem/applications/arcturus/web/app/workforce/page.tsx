import Card from '../../components/ui/Card';

export default function WorkforcePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-sky-700">Arcturus</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Workforce & Agent Roster</h1>
        <p className="mt-2 text-sm text-slate-600">Materialized Synthetic Agents, Capabilities & Rosters.</p>
      </div>

      <Card className="p-6">
        <h2 className="font-semibold text-slate-900">Synthetic Agents</h2>
        <p className="mt-2 text-sm text-slate-600">
          Agent capability vectors, availability windows, and managerial hierarchies materialized from Enterprise templates.
        </p>
        <div className="mt-4 rounded-lg bg-slate-50 p-4 border border-slate-200">
          <p className="text-xs font-mono text-slate-700">Workforce Engine: Active (Agent Isolation Enforced)</p>
        </div>
      </Card>
    </div>
  );
}
