import Card from '../ui/Card';

export default function LineageGraph({ available = false }: { available?: boolean }) {
  return (
    <Card className="p-5">
      <h2 className="font-semibold text-slate-950">Provenance</h2>
      <p className="mt-2 text-sm text-slate-600">
        {available ? 'Lineage is available for this corpus.' : 'Complete experiment-to-artifact lineage is unavailable from the current backend response.'}
      </p>
    </Card>
  );
}
