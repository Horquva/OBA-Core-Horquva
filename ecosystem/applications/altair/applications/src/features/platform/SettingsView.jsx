import React, { useState } from "react";
import { BellRing, Check, Database, Globe2, Save, Settings2, ShieldCheck } from "lucide-react";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";

export function SettingsView() {
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({ demo: true, approvals: true, realtime: true, timezone: "Asia/Karachi" });
  const flip = (key) => setSettings((s) => ({ ...s, [key]: !s[key] }));
  const save = () => { setSaved(true); window.setTimeout(() => setSaved(false), 1600); };
  return <div className="view">
    <div className="view-head"><div><h1>Settings</h1><p className="muted">Configure core Altair behavior for this environment.</p></div><Button variant="primary" icon={Save} onClick={save}>{saved ? "Saved" : "Save changes"}</Button></div>
    <Panel title="Execution settings" subtitle="Defaults used by the workflow engine and scheduler.">
      <div className="settings-list">
        {[['demo','Demo execution mode','Simulate external adapters when production credentials are unavailable', Database],['approvals','Protected action approvals','Require approval before production-impacting steps execute', ShieldCheck],['realtime','Realtime updates','Keep the dashboard synchronized with worker events', BellRing]].map(([key,title,desc,Icon]) => <button className="setting-row" key={key} onClick={() => flip(key)}><div className="setting-icon"><Icon size={17}/></div><div className="setting-main"><strong>{title}</strong><span>{desc}</span></div><span className={`toggle ${settings[key] ? 'on' : ''}`}><span></span></span></button>)}
      </div>
    </Panel>
    <Panel title="Environment" subtitle="General platform defaults.">
      <div className="form-grid"><label className="form-field"><span>Timezone</span><select value={settings.timezone} onChange={(e) => setSettings(s => ({...s, timezone:e.target.value}))}><option>Asia/Karachi</option><option>UTC</option><option>Asia/Dubai</option></select><span className="field-hint">Used for schedules and timestamps.</span></label><label className="form-field"><span>Environment</span><div className="static-field"><Globe2 size={15}/> Local / Development</div><span className="field-hint">Production integrations can be enabled through environment variables.</span></label></div>
    </Panel>
    <div className="security-note"><Settings2 size={17}/><div><strong>Configuration is intentionally safe for local demos</strong><span>Secrets are not stored in the browser. Use the server environment for production credentials.</span></div></div>
  </div>;
}
