import React, { useMemo, useState } from "react";
import { BookOpen, CheckCircle2, Copy, Play, Plus, Search, Trash2 } from "lucide-react";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { ActionDialog } from "../../components/ui/ActionDialog";

const seed = [
  { title: "Recover failed deployment", category: "Deployment", steps: 7, used: 24, owner: "Platform" },
  { title: "Investigate stuck workflow", category: "Automation", steps: 5, used: 18, owner: "SRE" },
  { title: "Restore webhook delivery", category: "Integrations", steps: 6, used: 11, owner: "Platform" },
  { title: "Prepare rollback", category: "Release", steps: 4, used: 9, owner: "Release" },
];
export function RunbooksView() {
  const [items,setItems]=useState(seed),[ran,setRan]=useState(null),[open,setOpen]=useState(false),[query,setQuery]=useState("");
  const [form,setForm]=useState({title:"",category:"Operations",steps:3,owner:"Platform"});
  const filtered=useMemo(()=>items.filter(x=>x.title.toLowerCase().includes(query.toLowerCase())||x.category.toLowerCase().includes(query.toLowerCase())),[items,query]);
  const add=()=>{if(!form.title.trim())return;setItems(a=>[...a,{title:form.title.trim(),category:form.category,steps:Number(form.steps)||1,used:0,owner:form.owner}]);setForm({title:"",category:"Operations",steps:3,owner:"Platform"});setOpen(false);setRan(`Created ${form.title.trim()}`);};
  const duplicate=(item)=>setItems(a=>[...a,{...item,title:`${item.title} (copy)`,used:0}]);
  const run=(item)=>{setItems(a=>a.map(x=>x.title===item.title?{...x,used:x.used+1}:x));setRan(`Runbook ${item.title} queued in demo mode.`)};
  const remove=(title)=>setItems(a=>a.filter(x=>x.title!==title));
  return <div className="view"><div className="view-head"><div><h1>Runbooks</h1><p className="muted">Reusable operational procedures for incidents, releases, and recovery tasks.</p></div><Button variant="primary" icon={Plus} onClick={()=>setOpen(true)}>New runbook</Button></div>
    <div className="toolbar"><div className="search-box"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search runbooks..." /></div><Badge tone="muted">{filtered.length} procedures</Badge></div>
    <div className="runbook-grid">{filtered.map((item)=><div className="runbook-card" key={item.title}><div className="runbook-icon"><BookOpen size={18}/></div><div className="runbook-title"><strong>{item.title}</strong><Badge tone="blue">{item.category}</Badge></div><span className="muted small">{item.steps} steps · Used {item.used} times · {item.owner}</span><div className="runbook-actions"><Button size="sm" variant="primary" icon={Play} onClick={()=>run(item)}>Run</Button><Button size="sm" variant="ghost" icon={Copy} onClick={()=>duplicate(item)}>Duplicate</Button><Button size="sm" variant="danger-outline" icon={Trash2} onClick={()=>remove(item.title)}>Delete</Button></div></div>)}</div>
    {ran && <div className="toast-note"><CheckCircle2 size={15}/><span>{ran}</span></div>}
    {open && <ActionDialog title="New runbook" subtitle="Create a reusable operational procedure." onClose={()=>setOpen(false)} onSubmit={add} disabled={!form.title.trim()} submitLabel="Create runbook"><div className="dialog-grid"><label className="form-field"><span>Title</span><input autoFocus value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Restart unhealthy service" /></label><label className="form-field"><span>Category</span><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option>Operations</option><option>Deployment</option><option>Automation</option><option>Integrations</option><option>Release</option></select></label><label className="form-field"><span>Steps</span><input type="number" min="1" max="50" value={form.steps} onChange={e=>setForm({...form,steps:e.target.value})}/></label><label className="form-field"><span>Owner</span><input value={form.owner} onChange={e=>setForm({...form,owner:e.target.value})}/></label></div></ActionDialog>}
  </div>;
}
