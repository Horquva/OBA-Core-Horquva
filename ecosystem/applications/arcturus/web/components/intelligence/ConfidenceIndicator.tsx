export default function ConfidenceIndicator({ score }: { score: number }) {
  const percentage = Math.round(Math.max(0, Math.min(1, score)) * 100);

  return (
    <div className="min-w-40">
      <div className="flex justify-between text-xs text-slate-500">
        <span>Confidence</span>
        <span>{percentage}%</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-200" aria-label={`Confidence ${percentage}%`}>
        <div className="h-2 rounded-full bg-sky-600" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
