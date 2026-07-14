import { OutlookSummary } from '../../components/forecast/OutlookSummary';
import { TrendArrow } from '../../components/forecast/TrendArrow';

export default function ForecastPage() {
  return (
    <div className="space-y-8 pb-12">
      {/* Header — matches exact pattern used across admin, workflows, risk */}
      <div className="animate-fade-up">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight mb-1">
            Forecast &amp; Outlook
          </h1>
          <p className="text-slate-400 text-sm">
            Predictive modeling and trajectory analysis across health, memory, and continuity horizons.
          </p>
        </div>
      </div>

      <OutlookSummary />
      <TrendArrow />
    </div>
  );
}
