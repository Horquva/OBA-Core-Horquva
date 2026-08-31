import Card from '../ui/Card';

export default function ClockDisplay({ tick, status }: { tick: number; status: string }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Runtime clock</p>
      <div className="mt-3 flex items-end justify-between gap-4">
        <p className="text-4xl font-semibold text-slate-950">Tick {tick}</p>
        <p className="text-sm text-slate-600">{status}</p>
      </div>
    </Card>
  );
}
