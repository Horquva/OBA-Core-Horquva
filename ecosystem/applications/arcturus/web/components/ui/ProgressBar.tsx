interface ProgressBarProps {
  progress: number;
  color?: string;
  className?: string;
}

export default function ProgressBar({ progress, color = "var(--brand-primary)", className = "" }: ProgressBarProps) {
  return (
    <div className={`w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden ${className}`}>
      <div 
        className="h-full transition-all duration-500 ease-out rounded-full" 
        style={{ width: `${Math.max(0, Math.min(100, progress))}%`, backgroundColor: color }}
      />
    </div>
  );
}
