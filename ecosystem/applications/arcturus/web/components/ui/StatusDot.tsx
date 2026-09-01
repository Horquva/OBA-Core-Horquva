interface StatusDotProps {
  status: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  animate?: boolean;
}

export default function StatusDot({ status, animate = false }: StatusDotProps) {
  const getColors = () => {
    switch (status) {
      case 'success': return 'bg-[var(--status-success)]';
      case 'warning': return 'bg-[var(--status-warning)]';
      case 'danger': return 'bg-[var(--status-danger)]';
      case 'info': return 'bg-[var(--status-info)]';
      default: return 'bg-slate-400';
    }
  };

  const bgClass = getColors();

  return (
    <span className="relative flex h-2.5 w-2.5">
      {animate && (
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${bgClass}`}></span>
      )}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${bgClass}`}></span>
    </span>
  );
}
