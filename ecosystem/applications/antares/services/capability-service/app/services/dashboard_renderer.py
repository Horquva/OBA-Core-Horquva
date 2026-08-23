"""
Renders build_dashboard_context()'s data into the final HTML command
interface. Kept separate from dashboard_service.py so data-building and
presentation stay independent.
"""

STATUS_COLOR = {
    "completed": "#4FD1A5", "healthy": "#4FD1A5",
    "pending": "#8B93A7", "in_progress": "#E8A33D", "blocked": "#E8A33D",
    "proposed": "#E8A33D", "degraded": "#E8A33D",
    "failed": "#E5605A", "escalated": "#E5605A", "at_risk": "#E5605A",
    "approved": "#4FD1A5", "rejected": "#E5605A",
}


def _dot(status: str) -> str:
    color = STATUS_COLOR.get(status, "#8B93A7")
    return f'<span class="dot" style="background:{color}"></span>'


def render_dashboard_html(ctx: dict) -> str:
    state = ctx["state"]
    health = state["organizational_health"]["status"]
    success_rate = state["organizational_health"]["task_success_rate"]
    success_rate_str = f"{success_rate*100:.0f}%" if success_rate is not None else "—"

    agents_rows = "".join(
        f'<tr><td>{_dot("completed" if a["active_tasks"]==0 else "in_progress")}{a["title"]}</td>'
        f'<td>{a["active_tasks"]}</td><td>{a["completed_tasks"]}</td>'
        f'<td class="muted">{a["constraints"] or "—"}</td></tr>'
        for a in ctx["agents"]
    ) or '<tr><td colspan="4" class="empty">No agents registered.</td></tr>'

    task_rows = "".join(
        f'<tr><td>{_dot(t["status"])}{t["title"]}</td><td>{t["status"]}</td>'
        f'<td class="mono">{t["assignee_type"]}</td><td class="mono">{t["retries"]}</td></tr>'
        for t in ctx["tasks"]
    ) or '<tr><td colspan="4" class="empty">No tasks yet.</td></tr>'

    lesson_items = "".join(f'<li>{l}</li>' for l in ctx["lessons"]) or '<li class="empty">No lessons recorded yet.</li>'

    decision_rows = "".join(
        f'<tr><td>{_dot(d["status"])}{d["context"]}</td><td>{d["status"]}</td>'
        f'<td class="mono">{d["approver"]}</td></tr>'
        for d in ctx["decisions"]
    ) or '<tr><td colspan="3" class="empty">No decisions recorded.</td></tr>'

    pending_items = "".join(
        f'<li>{_dot("pending")}{p["context"][:90]}</li>' for p in ctx["pending_decisions"]
    ) or '<li class="empty">No pending approvals.</li>'

    escalation_items = "".join(
        f'<li>{_dot("escalated")}{e["reason"][:90]}</li>' for e in ctx["escalations"]
    ) or '<li class="empty">No unresolved escalations.</li>'

    policy_rows = "".join(
        f'<tr><td>{p["name"]}</td><td>{"Requires approval" if p["requires_approval"] else "No gate"}</td></tr>'
        for p in ctx["policies"]
    ) or '<tr><td colspan="2" class="empty">No policies registered.</td></tr>'

    ledger_items = "".join(
        f'<span class="ledger-item"><span class="ledger-time">{a["time"]}</span>'
        f'<span class="ledger-entity">{a["entity"]}</span>'
        f'<span class="ledger-action">{a["action"]}</span></span>'
        for a in ctx["audit_ledger"]
    ) or '<span class="ledger-item empty">No audit activity yet.</span>'

    objectives = "".join(f'<span class="chip">{o}</span>' for o in state["active_objectives"]) or '<span class="chip muted">None active</span>'

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>{ctx['org_name']} — Command Interface</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root {{
    --bg: #0B0E14;
    --panel: #131720;
    --border: #232838;
    --text: #E7E9EE;
    --muted: #8B93A7;
    --healthy: #4FD1A5;
    --pending: #E8A33D;
    --critical: #E5605A;
  }}
  * {{ box-sizing: border-box; }}
  body {{
    margin: 0; background: var(--bg); color: var(--text);
    font-family: 'IBM Plex Sans', -apple-system, sans-serif;
    padding: 32px; line-height: 1.5;
  }}
  .mono {{ font-family: 'IBM Plex Mono', monospace; }}
  .muted {{ color: var(--muted); }}
  .topbar {{
    display: flex; justify-content: space-between; align-items: flex-start;
    border-bottom: 1px solid var(--border); padding-bottom: 20px; margin-bottom: 24px;
    flex-wrap: wrap; gap: 16px;
  }}
  .org-name {{ font-size: 22px; font-weight: 600; letter-spacing: -0.01em; }}
  .org-mission {{ color: var(--muted); font-size: 13px; margin-top: 4px; max-width: 520px; }}
  .health-pill {{
    font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 500;
    padding: 6px 12px; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.06em;
    border: 1px solid; white-space: nowrap;
  }}
  .health-healthy {{ color: var(--healthy); border-color: var(--healthy); background: rgba(79,209,165,0.08); }}
  .health-degraded {{ color: var(--pending); border-color: var(--pending); background: rgba(232,163,61,0.08); }}
  .health-at_risk {{ color: var(--critical); border-color: var(--critical); background: rgba(229,96,90,0.08); }}
  .objectives {{ margin-top: 10px; }}
  .chip {{
    display: inline-block; font-family: 'IBM Plex Mono', monospace; font-size: 11px;
    padding: 4px 9px; border: 1px solid var(--border); border-radius: 3px;
    color: var(--muted); margin-right: 6px; margin-top: 6px;
  }}
  .meta-row {{ font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--muted); text-align: right; }}
  .grid {{
    display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;
    align-items: start;
  }}
  @media (max-width: 760px) {{ .grid {{ grid-template-columns: 1fr; }} }}
  .panel {{
    background: var(--panel); border: 1px solid var(--border); border-radius: 6px;
    padding: 18px 20px; overflow: hidden;
  }}
  .panel h2 {{
    font-size: 11px; text-transform: uppercase; letter-spacing: 0.09em;
    color: var(--muted); margin: 0 0 14px 0; font-weight: 600;
    font-family: 'IBM Plex Mono', monospace;
  }}
  table {{ width: 100%; border-collapse: collapse; font-size: 13px; }}
  th {{ text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em;
        color: var(--muted); font-weight: 500; padding: 0 14px 8px 0; }}
  td {{ padding: 7px 14px 7px 0; border-top: 1px solid var(--border); vertical-align: middle; white-space: nowrap; }}
  td:first-child {{ white-space: normal; }}
  .dot {{ display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 8px; }}
  ul {{ list-style: none; margin: 0; padding: 0; font-size: 13px; }}
  li {{ padding: 7px 0; border-top: 1px solid var(--border); }}
  li:first-child {{ border-top: none; }}
  .empty {{ color: var(--muted); font-style: italic; }}
  .ledger {{
    background: var(--panel); border: 1px solid var(--border); border-radius: 6px;
    padding: 12px 20px; overflow-x: auto; white-space: nowrap;
    font-family: 'IBM Plex Mono', monospace; font-size: 11px;
  }}
  .ledger h2 {{ font-size: 11px; text-transform: uppercase; letter-spacing: 0.09em;
                color: var(--muted); margin: 0 0 10px 0; font-weight: 600; }}
  .ledger-item {{ display: inline-block; margin-right: 22px; }}
  .ledger-time {{ color: var(--muted); margin-right: 8px; }}
  .ledger-entity {{ color: var(--healthy); margin-right: 6px; }}
  .ledger-action {{ color: var(--text); }}
  .stat-row {{ display: flex; gap: 24px; margin-bottom: 16px; flex-wrap: wrap; }}
  .stat {{ font-family: 'IBM Plex Mono', monospace; }}
  .stat-value {{ font-size: 20px; font-weight: 600; }}
  .stat-label {{ font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }}
</style>
</head>
<body>

  <div class="topbar">
    <div>
      <div class="org-name">{ctx['org_name']}</div>
      <div class="org-mission">{ctx['org_mission']}</div>
      <div class="objectives">{objectives}</div>
    </div>
    <div>
      <span class="health-pill health-{health}">{health.replace('_',' ')} · {success_rate_str} success</span>
      <div class="meta-row" style="margin-top:10px;">Generated {ctx['generated_at']}</div>
    </div>
  </div>

  <div class="stat-row">
    <div class="stat"><div class="stat-value">{state['active_agents']}</div><div class="stat-label">Active Agents</div></div>
    <div class="stat"><div class="stat-value">{state['completed_tasks']}</div><div class="stat-label">Completed</div></div>
    <div class="stat"><div class="stat-value">{state['blocked_tasks']}</div><div class="stat-label">Blocked</div></div>
    <div class="stat"><div class="stat-value">{state['pending_decisions']}</div><div class="stat-label">Pending Approvals</div></div>
    <div class="stat"><div class="stat-value">{state['unresolved_escalations']}</div><div class="stat-label">Escalations</div></div>
  </div>

  <div class="grid">
    <div class="panel">
      <h2>Agents</h2>
      <table>
        <tr><th>Agent</th><th>Active</th><th>Completed</th><th>Constraints</th></tr>
        {agents_rows}
      </table>
    </div>

    <div class="panel">
      <h2>Execution</h2>
      <table>
        <tr><th>Task</th><th>Status</th><th>Assignee</th><th>Retries</th></tr>
        {task_rows}
      </table>
    </div>

    <div class="panel">
      <h2>Intelligence — Organizational Memory</h2>
      <ul>{lesson_items}</ul>
    </div>

    <div class="panel">
      <h2>Intelligence — Decisions</h2>
      <table>
        <tr><th>Context</th><th>Status</th><th>Approver</th></tr>
        {decision_rows}
      </table>
    </div>

    <div class="panel">
      <h2>Governance — Pending Approvals</h2>
      <ul>{pending_items}</ul>
    </div>

    <div class="panel">
      <h2>Governance — Escalations &amp; Policies</h2>
      <ul style="margin-bottom:14px;">{escalation_items}</ul>
      <table>
        <tr><th>Policy</th><th>Gate</th></tr>
        {policy_rows}
      </table>
    </div>
  </div>

  <div class="ledger">
    <h2>Constitutional Ledger — Recent Audit Trail</h2>
    {ledger_items}
  </div>

</body>
</html>"""
