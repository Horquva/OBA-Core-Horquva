import { Search, Bell, Settings, User } from "lucide-react";

export default function TopBar() {
  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-[var(--card-border)] bg-[var(--card-bg)] shrink-0 z-10">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search experiments, runs, or insights..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 border-none rounded-md focus:ring-2 focus:ring-[var(--brand-primary)] outline-none"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4 text-slate-500">
        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--status-danger)] rounded-full"></span>
        </button>
        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
          <Settings className="w-5 h-5" />
        </button>
        <div className="w-px h-6 bg-[var(--card-border)] mx-2"></div>
        <button className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 p-1 pr-3 rounded-full border border-[var(--card-border)]">
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
            <User className="w-4 h-4 text-slate-600" />
          </div>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Admin</span>
        </button>
      </div>
    </header>
  );
}
