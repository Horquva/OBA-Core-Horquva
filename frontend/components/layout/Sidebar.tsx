"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  Zap,
  ListChecks,
  ShieldCheck,
  Workflow,
  Sparkles,
  Sun,
  Moon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

const navigation: NavItem[] = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "Inventory", href: "/inventory", icon: Layers },
  { name: "What-If Simulation", href: "/simulation", icon: Zap },
  { name: "Campaigns", href: "/campaigns", icon: ListChecks },
  { name: "n8n Ownership Scan", href: "/n8n-check", icon: ShieldCheck, badge: "Free v0" },
  { name: "Connectors", href: "/connectors", icon: Workflow },
];

export function Sidebar({ onOpenAskHorquva }: { onOpenAskHorquva?: () => void }) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col h-screen select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
            H
          </div>
          <div>
            <span className="font-bold text-slate-900 dark:text-white tracking-tight text-lg leading-tight block">
              Horquva
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-normal block">
              Operational Continuity
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`} />
              <span className="flex-1 truncate">{item.name}</span>
              {item.badge && (
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Ask Horquva Trigger & Theme Toggle Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
        <button
          onClick={onOpenAskHorquva}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium text-sm shadow-md hover:from-blue-500 hover:to-indigo-500 transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-blue-200" />
          <span>Ask Horquva</span>
        </button>

        <div className="flex items-center justify-between pt-2 px-1 text-xs text-slate-500">
          <span>Theme</span>
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
            title="Toggle Theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
