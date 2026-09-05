import React, { useState } from "react";
import { CheckCircle2, PlugZap, RefreshCw, Settings2, Wifi, Plus, Trash2 } from "lucide-react";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { ActionDialog } from "../../components/ui/ActionDialog";

const initial = [
  { id: "http", name: "HTTP / Webhook", desc: "Call external services from workflow steps.", status: "Connected", tone: "green", endpoint: "https://api.example.internal" },
  { id: "slack", name: "Slack Notifications", desc: "Send workflow alerts and approval updates.", status: "Connected", tone: "green", endpoint: "#altair-ops" },
  { id: "github", name: "GitHub", desc: "Read repository events and deployment metadata.", status: "Ready to configure", tone: "amber", endpoint: "github.com" },
  { id: "email", name: "Email / SMTP", desc: "Deliver operational notifications and reports.", status: "Ready to configure", tone: "amber", endpoint: "smtp.internal" },
];

export function IntegrationsView() {
  const [items, setItems] = useState(initial);
  const [testing, setTesting] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "HTTP / Webhook", endpoint: "" });
  const [message, setMessage] = useState("");
  const test = (id) => {
    setTesting(id); setMessage("");
    window.setTimeout(() => { setItems((all) => all.map((item) => item.id === id ? { ...item, status: "Connected", tone: "green" } : item)); setTesting(null); setMessage("Connection test completed successfully."); }, 650);
  };
  const add = () => {
    const name = form.name.trim(); const endpoint = form.endpoint.trim();
    if (!name || !endpoint) return;
    const id = `${form.type.toLowerCase().replace(/[^a-z0-9]+/g,"-")}-${Date.now()}`;
    setItems((all) => [...all, { id, name, desc: `${form.type} connector added locally.`, status: "Connected", tone: "green", endpoint }]);
    setForm({ name: "", type: "HTTP / Webhook", endpoint: "" }); setOpen(false); setMessage(`${name} was added and connected in demo mode.`);
  };
  const remove = (id) => setItems((all) => all.filter((x) => x.id !== id));
  return <div className="view">
    <div className="view-head"><div><h1>Integrations</h1><p className="muted">Manage the services Altair can use during workflow execution.</p></div><Button variant="primary" icon={Plus} onClick={() => setOpen(true)}>Add integration</Button></div>
    {message && <div className="toast-note"><CheckCircle2 size={15}/><span>{message}</span></div>}
    <div className="stat-grid">
      <div className="stat-card"><div className="stat-icon blue"><PlugZap size={16}/></div><div><div className="stat-value">{items.length}</div><div className="stat-label">Configured connectors</div></div></div>
      <div className="stat-card"><div className="stat-icon green"><CheckCircle2 size={16}/></div><div><div className="stat-value">{items.filter(i=>i.tone === "green").length}</div><div className="stat-label">Healthy</div></div></div>
      <div className="stat-card"><div className="stat-icon amber"><Settings2 size={16}/></div><div><div className="stat-value">{items.filter(i=>i.tone === "amber").length}</div><div className="stat-label">Needs configuration</div></div></div>
      <div className="stat-card"><div className="stat-icon purple"><Wifi size={16}/></div><div><div className="stat-value">Demo</div><div className="stat-label">Execution mode</div></div></div>
    </div>
    <Panel title="Connection registry" subtitle="Adapters available to workflow steps.">
      <div className="platform-list">{items.map((item) => <div className="platform-row" key={item.id}>
        <div className="platform-icon"><PlugZap size={17}/></div><div className="platform-main"><strong>{item.name}</strong><span>{item.desc}</span><code>{item.endpoint}</code></div>
        <Badge status={item.tone === "green" ? "succeeded" : "pending"} size="sm" /><div className="platform-actions"><span className="platform-status">{item.status}</span><Button size="sm" variant="default" icon={testing === item.id ? RefreshCw : Wifi} onClick={() => test(item.id)} disabled={testing === item.id}>{testing === item.id ? "Testing…" : "Test"}</Button><Button size="sm" variant="danger-outline" icon={Trash2} onClick={() => remove(item.id)}>Remove</Button></div>
      </div>)}</div>
    </Panel>
    <Panel title="Local execution" subtitle="Demo mode keeps the project usable without private external credentials."><div className="notice-row"><CheckCircle2 size={17}/><div><strong>Demo adapters enabled</strong><p className="muted">External calls are simulated locally. Set the production integration variables before connecting real services.</p></div></div></Panel>
    {open && <ActionDialog title="Add integration" subtitle="Create a connector that is immediately available in this demo environment." onClose={() => setOpen(false)} onSubmit={add} disabled={!form.name.trim() || !form.endpoint.trim()} submitLabel="Add connector">
      <div className="dialog-grid"><label className="form-field"><span>Name</span><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Jira webhook" autoFocus /></label><label className="form-field"><span>Type</span><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option>HTTP / Webhook</option><option>Slack Notifications</option><option>GitHub</option><option>Email / SMTP</option></select></label><label className="form-field full"><span>Endpoint</span><input value={form.endpoint} onChange={e=>setForm({...form,endpoint:e.target.value})} placeholder="https://service.example/api" /></label></div>
    </ActionDialog>}
  </div>;
}
