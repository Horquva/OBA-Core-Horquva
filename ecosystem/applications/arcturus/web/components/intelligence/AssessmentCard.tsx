import type { StructuredAssessment } from '../../lib/types';
import Card from '../ui/Card';
import ConfidenceIndicator from './ConfidenceIndicator';

export default function AssessmentCard({ assessment }: { assessment: StructuredAssessment }) {
  const experimentId = assessment.experiment_id || (assessment.context as any)?.experiment_id || 'N/A';
  const summary = assessment.assessment_summary || assessment.reasoning || assessment.verdict || '';
  const risks = assessment.risk_factors || [];
  const recs = assessment.recommendations || [];
  const citations = assessment.evidence_citations || [];

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Evidence-grounded assessment</p>
          <p className="mt-2 break-all font-mono text-xs text-slate-500">Experiment {experimentId}</p>
        </div>
        <ConfidenceIndicator score={assessment.confidence_score} />
      </div>
      <p className="mt-5 text-sm leading-6 text-slate-700">{summary}</p>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <section>
          <h3 className="text-sm font-semibold text-slate-900">Risk factors</h3>
          {risks.length === 0 ? <p className="mt-2 text-sm text-slate-500">None supplied.</p> : <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">{risks.map((risk) => <li key={risk}>{risk}</li>)}</ul>}
        </section>
        <section>
          <h3 className="text-sm font-semibold text-slate-900">Recommendations</h3>
          {recs.length === 0 ? <p className="mt-2 text-sm text-slate-500">None supplied.</p> : <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">{recs.map((recommendation) => <li key={recommendation}>{recommendation}</li>)}</ul>}
        </section>
      </div>
      <div className="mt-5 border-t border-slate-100 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Supporting evidence</p>
        <p className="mt-2 break-all font-mono text-xs text-slate-600">{citations.length > 0 ? citations.join(', ') : 'None cited'}</p>
      </div>
    </Card>
  );
}
