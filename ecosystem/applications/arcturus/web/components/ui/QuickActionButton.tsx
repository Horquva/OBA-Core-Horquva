import { LucideIcon } from "lucide-react";

interface QuickActionButtonProps {
  icon: LucideIcon;
  label: string;
  description: string;
  onClick?: () => void;
  primary?: boolean;
}

export default function QuickActionButton({ icon: Icon, label, description, onClick, primary = false }: QuickActionButtonProps) {
  return (
    <button 
      onClick={onClick}
      className={`text-left p-4 rounded-xl border transition-all flex flex-col gap-3 group
        ${primary 
          ? 'bg-[var(--brand-primary)] text-white border-transparent hover:bg-indigo-700' 
          : 'bg-[var(--card-bg)] border-[var(--card-border)] text-slate-800 dark:text-slate-200 hover:border-slate-300 hover:shadow-sm'
        }`}
    >
      <div className={`p-2 rounded-lg w-fit ${primary ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30'}`}>
        <Icon className={`w-5 h-5 ${primary ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'}`} />
      </div>
      <div>
        <h4 className="font-medium text-sm mb-1">{label}</h4>
        <p className={`text-xs ${primary ? 'text-indigo-100' : 'text-slate-500'}`}>{description}</p>
      </div>
    </button>
  );
}
