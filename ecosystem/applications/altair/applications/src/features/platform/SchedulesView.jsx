import React, { useState } from "react";
import { CalendarClock, Clock3, Pause, Play, Plus, RefreshCw, CheckCircle2 } from "lucide-react";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { ActionDialog } from "../../components/ui/ActionDialog";
import { useAltair } from "../../context/AltairContext";

const seed = [
  { id: 1, name: "Close Stale Sprint Issues", workflow: "Close stale sprint issues", cron: "Every 30 min", next: "in 12 min", active: true },
  { id: 2, name: "Daily Deployment Summary", workflow: "Deployment summary", cron: "Every day · 18:00", next: "today 18:00", active: true },
  { id: 3, name: "Nightly Smoke Tests", workflow: "Run smoke tests", cron: "Every day · 23:30", next: "today 23:30", active: false },
];

export function SchedulesView() {
  const { workflows, initiateWorkflow } = useAltair();
  const [rows, setRows] = useState(seed); const [open,setOpen]=useState(false); const [message,setMessage]=useState("");
  const [form,setForm]=useState({name:"",workflow:"",cron:"Every day · 18:00"});
  const toggle = (id) => setRows((all) => all.map((r) => r.id === id ? { ...r, active: !r.active } : r));
  const add = () => { if(!form.name.trim()||!form.workflow)return; setRows(all=>[...all,{id:Date.now(),name:form.name.trim(),workflow:workflows.find(w=>w.id===form.workflow)?.name||form.workflow,cron:form.cron,next:"new",active:true}]); setForm({name:"",workflow:"",cron:"Every day · 18:00"});setOpen(false);setMessage("Schedule created and enabled."); };
  const runNow = async (row) => { const wf=workflows.find(w=>w.name.toLowerCase()===row.workflow.toLowerCase()) || workflows.find(w=>w.name.toLowerCase().includes(row.workflow.toLowerCase().split(" ")[0])); if(!wf){setMessage(`No matching workflow found for ${row.name}.`);return;} try{await initiateWorkflow(wf.id,{} ,crypto.randomUUID());setMessage(`${row.name} started ${wf.name}.`);}catch(e){setMessage(e.message||"Unable to start schedule.");} };
  return <div className="view">
    <div className="view-head"><div><h1>Schedules</h1><p className="muted">Automate recurring workflow execution with clear ownership and run controls.</p></div><Button variant="primary" icon={Plus} onClick={()=>setOpen(true)}>New schedule</Button></div>
    {message && <div className="toast-note"><CheckCircle2 size={15}/><span>{message}</span></div>}
    <Panel title="Scheduler overview" subtitle="Current recurring jobs registered with the Altair worker."><div className="schedule-grid">{rows.map((row) => <div className="schedule-card" key={row.id}>
      <div className="schedule-top"><div className="schedule-icon"><CalendarClock size={18}/></div><span className={`schedule-dot ${row.active ? "on" : "off"}`}></span></div><strong>{row.name}</strong><span className="muted small">Workflow · {row.workflow}</span><div className="schedule-meta"><span><Clock3 size={13}/> {row.cron}</span><span>Next: {row.next}</span></div>
      <div className="schedule-actions"><Button size="sm" variant={row.active ? "default" : "primary"} icon={row.active ? Pause : Play} onClick={() => toggle(row.id)}>{row.active ? "Pause" : "Enable"}</Button><Button size="sm" variant="ghost" icon={RefreshCw} onClick={()=>runNow(row)} disabled={!row.active}>Run now</Button></div>
    </div>)}</div></Panel>
    <Panel title="Scheduler policy" subtitle="Recommended defaults for production automation."><div className="policy-grid"><div><strong>Retries</strong><span className="muted">3 attempts with exponential backoff</span></div><div><strong>Concurrency</strong><span className="muted">1 run per schedule</span></div><div><strong>Timezone</strong><span className="muted">Asia/Karachi</span></div></div></Panel>
    {open && <ActionDialog title="New schedule" subtitle="Create a recurring workflow schedule." onClose={()=>setOpen(false)} onSubmit={add} disabled={!form.name.trim()||!form.workflow} submitLabel="Create schedule"><div className="dialog-grid"><label className="form-field"><span>Schedule name</span><input autoFocus value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Hourly health check" /></label><label className="form-field"><span>Workflow</span><select value={form.workflow} onChange={e=>setForm({...form,workflow:e.target.value})}><option value="">Choose workflow</option>{workflows.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label><label className="form-field full"><span>Frequency</span><select value={form.cron} onChange={e=>setForm({...form,cron:e.target.value})}><option>Every 15 min</option><option>Every 30 min</option><option>Every hour</option><option>Every day · 09:00</option><option>Every day · 18:00</option></select></label></div></ActionDialog>}
  </div>;
}
