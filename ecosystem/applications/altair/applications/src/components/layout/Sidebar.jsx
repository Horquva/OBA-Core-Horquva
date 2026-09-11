import React from "react";
import { GitBranch } from "lucide-react";
import { useAltair } from "../../context/AltairContext";
import { STATUS } from "../../domain/status";
import { NAV } from "../../navigation/nav.config";

export function Sidebar({ route, navigate }) {
  const { executions, unreadCount, can } = useAltair();
  const pendingApprovals = executions.filter((e) => e.status === STATUS.pending_approval).length;
  const badges = { approvals: pendingApprovals, notifications: unreadCount };

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <GitBranch size={16} />
        </div>
        <div>
          <div className="brand-name">Altair</div>
          <div className="brand-sub">Workflow Automation</div>
        </div>
      </div>

      <nav className="nav">
        {NAV.filter((item) => !item.permission || can(item.permission)).map((item) => {
          const Icon = item.icon;
          const count = item.badgeKey ? badges[item.badgeKey] : 0;
          return (
            <button key={item.id} className={`nav-item ${route.view === item.id ? "active" : ""}`} onClick={() => navigate(item.id)}>
              <Icon size={16} />
              <span>{item.label}</span>
              {count > 0 && <span className="nav-count">{count}</span>}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="env-pill">
          <span className="dot green" /> Live API + worker
        </div>
        <p className="muted small">
          Workflow state is persisted by the Altair API and processed by the workflow worker. External adapters require explicit configuration.
        </p>
      </div>
    </aside>
  );
}
