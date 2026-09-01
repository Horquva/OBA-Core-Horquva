"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  TestTube, 
  Map, 
  Users, 
  GitMerge, 
  Activity, 
  FileCheck, 
  ShieldCheck, 
  BrainCircuit, 
  Database,
  Terminal,
  Settings
} from "lucide-react";

const NAV_SECTIONS = [
  {
    title: "Construction",
    items: [
      { name: "Command Center", href: "/", icon: LayoutDashboard },
      { name: "Experiments", href: "/experiments", icon: TestTube },
      { name: "Scenarios", href: "/scenarios", icon: Map },
      { name: "Workforce", href: "/workforce", icon: Users },
      { name: "Workflows", href: "/workflows", icon: GitMerge },
    ]
  },
  {
    title: "Analytics",
    items: [
      { name: "Runtime Engine", href: "/runtime", icon: Activity },
      { name: "Synthetic Data", href: "/data", icon: Database },
      { name: "Intelligence", href: "/intelligence", icon: BrainCircuit },
    ]
  },
  {
    title: "Governance",
    items: [
      { name: "Evidence Log", href: "/evidence", icon: FileCheck },
      { name: "Validation", href: "/validation", icon: ShieldCheck },
      { name: "System Logs", href: "/logs", icon: Terminal },
      { name: "Settings", href: "/settings", icon: Settings },
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="w-64 bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] h-full flex flex-col shrink-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800">
        <h2 className="font-bold text-2xl text-white tracking-tight">Arcturus</h2>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-1">Simulation Platform</p>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        {NAV_SECTIONS.map((section, idx) => (
          <div key={idx} className="mb-6 px-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 px-2">
              {section.title}
            </h3>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                
                return (
                  <li key={item.name}>
                    <Link 
                      href={item.href}
                      className={`flex items-center gap-3 px-2 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive 
                          ? "bg-[var(--brand-primary)] text-white" 
                          : "hover:bg-[var(--sidebar-hover)] hover:text-white"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* System Health Widget */}
      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">System Status</span>
            <span className="flex items-center gap-1.5 text-xs text-[var(--status-success)]">
              <span className="w-2 h-2 rounded-full bg-[var(--status-success)] animate-pulse"></span>
              Healthy
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">API Latency</span>
              <span className="text-slate-300">42ms</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Engine Load</span>
              <span className="text-slate-300">12%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Logo */}
      <div className="p-4 border-t border-slate-800 text-center">
        <span className="text-[10px] font-bold tracking-[0.2em] text-slate-600">HORQUVA</span>
      </div>
    </nav>
  );
}