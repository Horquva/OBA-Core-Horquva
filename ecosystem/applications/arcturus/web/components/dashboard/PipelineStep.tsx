import { LucideIcon } from "lucide-react";
import StatusDot from "../ui/StatusDot";

interface PipelineStepProps {
  label: string;
  icon: LucideIcon;
  status: 'pending' | 'running' | 'completed' | 'failed';
  isLast?: boolean;
}

export default function PipelineStep({ label, icon: Icon, status, isLast = false }: PipelineStepProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'completed': return 'text-[var(--status-success)] bg-[var(--status-success-bg)]';
      case 'running': return 'text-[var(--brand-primary)] bg-indigo-100';
      case 'failed': return 'text-[var(--status-danger)] bg-[var(--status-danger-bg)]';
      default: return 'text-slate-400 bg-slate-100 dark:bg-slate-800';
    }
  };

  const getDotStatus = () => {
    switch (status) {
      case 'completed': return 'success';
      case 'running': return 'info';
      case 'failed': return 'danger';
      default: return 'neutral';
    }
  };

  return (
    <div className="flex items-center flex-1">
      <div className="flex flex-col items-center gap-2 flex-1 relative">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-colors ${getStatusColor()}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex items-center gap-1.5">
          <StatusDot status={getDotStatus()} animate={status === 'running'} />
          <span className={`text-xs font-medium ${status === 'pending' ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
            {label}
          </span>
        </div>
      </div>
      {!isLast && (
        <div className={`flex-1 h-0.5 -mt-6 mx-2 transition-colors ${status === 'completed' ? 'bg-[var(--status-success)]' : 'bg-slate-200 dark:bg-slate-700'}`} />
      )}
    </div>
  );
}
