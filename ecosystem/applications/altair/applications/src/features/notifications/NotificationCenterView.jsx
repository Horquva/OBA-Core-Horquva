import React, { useEffect, useState } from "react";
import { ShieldCheck, CheckCircle2, AlertTriangle, RotateCcw, Info, Plus } from "lucide-react";
import { useAltair } from "../../context/AltairContext";
import { ViewHead } from "../../components/ui/ViewHead";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { timeAgo } from "../../utils/datetime";

const NOTIF_ICON = {
  approval_required: ShieldCheck,
  workflow_completed: CheckCircle2,
  workflow_failed: AlertTriangle,
  workflow_retried: RotateCcw,
  status_changed: Info,
};

export function NotificationCenterView({ navigate }) {
  const { notifications, markNotificationRead, markAllRead } = useAltair();
  const [filter, setFilter] = useState("all");
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [ruleEvent, setRuleEvent] = useState("workflow_failed");
  const [ruleChannel, setRuleChannel] = useState("in-app");
  const [rules, setRules] = useState(() => {
    try { return JSON.parse(localStorage.getItem("altair.alertRules") || "[]"); } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem("altair.alertRules", JSON.stringify(rules));
  }, [rules]);

  function addRule() {
    const name = ruleName.trim();
    if (!name) return;
    setRules((current) => [...current, { id: `rule-${Date.now()}`, name, event: ruleEvent, channel: ruleChannel, enabled: true }]);
    setRuleName("");
    setRuleEvent("workflow_failed");
    setRuleChannel("in-app");
    setShowRuleForm(false);
  }

  function toggleRule(id) {
    setRules((current) => current.map((rule) => rule.id === id ? { ...rule, enabled: !rule.enabled } : rule));
  }

  function deleteRule(id) {
    setRules((current) => current.filter((rule) => rule.id !== id));
  }
  const rows = notifications.filter((n) => filter === "all" || (filter === "unread" ? !n.read : n.type === filter));

  return (
    <div className="view">
      <ViewHead
        title="Notifications"
        subtitle="Actionable updates only — every item links to the workflow or execution it concerns."
        right={<div className="button-row"><Button variant="primary" size="sm" icon={Plus} onClick={() => setShowRuleForm((value) => !value)}>{showRuleForm ? "Close rule form" : "Add alert rule"}</Button><Button variant="ghost" size="sm" onClick={markAllRead}>Mark all read</Button></div>}
      />

      {showRuleForm && (
        <Panel title="Create alert rule" subtitle="Rules are saved locally for this browser session and applied to the notification view.">
          <div className="form-grid">
            <label className="form-field"><span>Rule name</span><input autoFocus value={ruleName} onChange={(e) => setRuleName(e.target.value)} placeholder="Production failure alert" /></label>
            <label className="form-field"><span>Event</span><select value={ruleEvent} onChange={(e) => setRuleEvent(e.target.value)}><option value="workflow_failed">Workflow failed</option><option value="workflow_retried">Workflow retried</option><option value="approval_required">Approval required</option><option value="workflow_completed">Workflow completed</option></select></label>
            <label className="form-field"><span>Channel</span><select value={ruleChannel} onChange={(e) => setRuleChannel(e.target.value)}><option value="in-app">In-app</option><option value="email">Email</option><option value="webhook">Webhook</option></select></label>
          </div>
          <div className="initiate-actions"><Button variant="ghost" onClick={() => setShowRuleForm(false)}>Cancel</Button><Button variant="primary" disabled={!ruleName.trim()} onClick={addRule}>Create rule</Button></div>
        </Panel>
      )}

      {rules.length > 0 && (
        <Panel title={`Alert rules (${rules.length})`} subtitle="Enable, disable, or remove your notification rules.">
          <div className="row-list">
            {rules.map((rule) => (
              <div className="row" key={rule.id}>
                <div className="row-main"><span className="row-title">{rule.name}</span><span className="row-sub">{rule.event.replaceAll("_", " ")} · {rule.channel}</span></div>
                <div className="row-end"><Button size="sm" variant={rule.enabled ? "primary" : "ghost"} onClick={() => toggleRule(rule.id)}>{rule.enabled ? "Enabled" : "Disabled"}</Button><Button size="sm" variant="danger-outline" onClick={() => deleteRule(rule.id)}>Delete</Button></div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <div className="chip-row">
        <button className={`chip ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>All</button>
        <button className={`chip ${filter === "unread" ? "active" : ""}`} onClick={() => setFilter("unread")}>Unread</button>
        <button className={`chip ${filter === "approval_required" ? "active" : ""}`} onClick={() => setFilter("approval_required")}>Approval required</button>
        <button className={`chip ${filter === "workflow_failed" ? "active" : ""}`} onClick={() => setFilter("workflow_failed")}>Failed</button>
      </div>

      <Panel>
        {rows.length === 0 ? (
          <EmptyState title="Nothing here" body="You're caught up." />
        ) : (
          <div className="notif-list">
            {rows.map((n) => {
              const Icon = NOTIF_ICON[n.type] || Info;
              return (
                <button
                  key={n.id}
                  className={`notif-row ${n.read ? "" : "unread"}`}
                  onClick={() => { markNotificationRead(n.id); navigate(n.link.view, n.link.id); }}
                >
                  <div className="notif-icon"><Icon size={15} /></div>
                  <div className="notif-body">
                    <span className="notif-title">{n.title}</span>
                    <span className="notif-msg">{n.message}</span>
                  </div>
                  <span className="notif-time">{timeAgo(n.at)}</span>
                </button>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
