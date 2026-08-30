import Card from '../ui/Card';

export default function ValidationSummary({ status, reason }: { status?: string; reason?: string }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Validation</p>
      <p className="mt-3 text-lg font-semibold text-slate-950">{status || 'Unavailable'}</p>
      <p className="mt-2 text-sm text-slate-600">{reason || 'No validation result is available from the current backend API.'}</p>
    </Card>
  );
}
