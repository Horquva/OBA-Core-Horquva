import React from "react";
import { Activity, ArrowRight, Database, Globe2, Server, ShieldCheck } from "lucide-react";
import { Panel } from "../../components/ui/Panel";
import { Badge } from "../../components/ui/Badge";

const services = [
  { name: "Operations UI", icon: Globe2, status: "Healthy", latency: "84ms", deps: "API Gateway" },
  { name: "API Gateway", icon: Server, status: "Healthy", latency: "42ms", deps: "Workflow Engine" },
  { name: "Workflow Engine", icon: Activity, status: "Degraded", latency: "190ms", deps: "State Store" },
  { name: "State Store", icon: Database, status: "Healthy", latency: "8ms", deps: "—" },
];

export function ServiceMapView() {
  return <div className="view">
    <div className="view-head"><div><h1>Service Map</h1><p className="muted">Understand how the Altair control plane connects before troubleshooting an execution.</p></div><Badge tone="green">Live topology</Badge></div>
    <Panel title="Runtime topology" subtitle="Current service health and dependency direction.">
      <div className="service-map">{services.map((service, idx) => { const Icon = service.icon; return <React.Fragment key={service.name}><div className={`service-node ${service.status === "Degraded" ? "degraded" : ""}`}><div className="service-icon"><Icon size={18}/></div><div><strong>{service.name}</strong><span className="muted small">Latency {service.latency}</span></div><Badge tone={service.status === "Healthy" ? "green" : "amber"}>{service.status}</Badge></div>{idx < services.length - 1 && <ArrowRight className="service-arrow" size={18}/>}</React.Fragment>; })}</div>
    </Panel>
    <div className="grid-2"><Panel title="Health signals"><div className="feature-kv"><div><Activity size={16}/><span>Workflow throughput <strong>98.4%</strong></span></div><div><ShieldCheck size={16}/><span>Policy checks <strong>100%</strong></span></div></div></Panel><Panel title="Dependency note"><p className="muted">Workflow Engine is currently degraded. New executions remain available in demo mode while retry pressure is monitored.</p></Panel></div>
  </div>;
}
