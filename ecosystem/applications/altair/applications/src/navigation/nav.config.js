import { Gauge, Layers, ShieldCheck, Terminal, History as HistoryIcon, Bell, FileClock, Wrench, PlugZap, CalendarClock, Activity, UsersRound, Settings2, Siren, CalendarDays, BookOpen, Network, BarChart3 } from "lucide-react";

/**
 * Sidebar navigation items. `badgeKey` is looked up against a small
 * badges map (pending approvals / unread notifications) computed in
 * components/layout/Sidebar.jsx from live context state.
 */
export const NAV = [
  { id: "overview", label: "Overview", icon: Gauge },
  { id: "builder", label: "Workflow Builder", icon: Wrench, permission: "workflow:write" },
  { id: "catalog", label: "Workflow Catalog", icon: Layers },
  { id: "approvals", label: "Approval Center", icon: ShieldCheck, badgeKey: "approvals", permission: "approval:decide" },
  { id: "operations", label: "Operations Center", icon: Terminal, permission: "operations:read" },
  { id: "history", label: "Execution History", icon: HistoryIcon, permission: "workflow:read" },
  { id: "notifications", label: "Notifications", icon: Bell, badgeKey: "notifications", permission: "workflow:read" },
  { id: "audit", label: "Audit Timeline", icon: FileClock, permission: "audit:read" },
  { id: "incidents", label: "Incident Center", icon: Siren, permission: "operations:read" },
  { id: "changes", label: "Change Calendar", icon: CalendarDays, permission: "operations:read" },
  { id: "runbooks", label: "Runbooks", icon: BookOpen, permission: "operations:read" },
  { id: "services", label: "Service Map", icon: Network, permission: "operations:read" },
  { id: "reports", label: "Reports & Insights", icon: BarChart3, permission: "workflow:read" },
  { id: "integrations", label: "Integrations", icon: PlugZap },
  { id: "schedules", label: "Schedules", icon: CalendarClock },
  { id: "health", label: "System Health", icon: Activity },
  { id: "access", label: "Access Control", icon: UsersRound },
  { id: "settings", label: "Settings", icon: Settings2 },
];
