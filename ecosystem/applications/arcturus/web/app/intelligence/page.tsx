import Link from 'next/link';
import Card from '../../components/ui/Card';

export default function IntelligencePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-sky-700">Arcturus</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Intelligence</h1>
        <p className="mt-2 text-sm text-slate-600">Evidence-grounded assessments for completed simulation runs.</p>
      </div>
      <Card className="border-amber-200 bg-amber-50 p-6">
        <h2 className="font-semibold text-amber-950">Assessment unavailable</h2>
        <p className="mt-2 text-sm leading-6 text-amber-900">No validated Intelligence assessment is available from the backend yet. This view will not display an assessment without validated evidence and supporting citations.</p>
        <Link href="/experiments" className="mt-4 inline-block text-sm font-semibold text-amber-950 underline underline-offset-4">Return to experiments</Link>
      </Card>
    </div>
  );
}
