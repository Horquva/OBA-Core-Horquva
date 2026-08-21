import { WF } from "../data/workflows";

/**
 * Builds the breadcrumb trail for the current route. Pure function of
 * `route` (+ the static workflow catalog) — used by components/layout/TopBar.jsx.
 */
export function breadcrumbFor(route) {
  const base = [{ label: "Altair", to: { view: "overview" } }];
  const map = {
    overview: [{ label: "Overview" }],
    catalog: [{ label: "Workflow Catalog" }],
    workflow: [{ label: "Workflow Catalog", to: { view: "catalog" } }, { label: WF[route.id]?.name || "Workflow" }],
    initiate: [{ label: "Workflow Catalog", to: { view: "catalog" } }, { label: WF[route.id]?.name || "Workflow", to: { view: "workflow", id: route.id } }, { label: "Initiate" }],
    approvals: [{ label: "Approval Center" }],
    execution: [{ label: "Operations Center", to: { view: "operations" } }, { label: route.id }],
    operations: [{ label: "Operations Center" }],
    history: [{ label: "Execution History" }],
    notifications: [{ label: "Notifications" }],
    audit: [{ label: "Audit Timeline" }],
    integrations: [{ label: "Integrations" }],
    schedules: [{ label: "Schedules" }],
    health: [{ label: "System Health" }],
    access: [{ label: "Access Control" }],
    settings: [{ label: "Settings" }],
    builder: [{ label: "Workflow Builder" }],
  };
  return [...base, ...(map[route.view] || [{ label: "Not found" }])];
}
