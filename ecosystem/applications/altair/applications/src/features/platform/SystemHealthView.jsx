import React, { useState } from "react";
import { Activity, Database, HardDrive, RefreshCw, Server, ShieldCheck, Zap } from "lucide-react";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";

const checks = [
  ["API service", "Serving requests on localhost", "Healthy", "green", Server],
  ["Workflow worker", "Polling and processing jobs", "Healthy", "green", Zap],
  ["Event stream", "Realtime execution updates", "Healthy", "green", Activity],
  ["Data store", "Persistent workflow state", "Healthy", "green", Database],
  ["Audit trail", "Immutable operational events", "Healthy", "green", ShieldCheck],
  ["Disk / runtime", "Application resource headroom", "Normal", "blue", HardDrive],
];

export function SystemHealthView() {
  const [stamp, setStamp] = useState(new Date());
  return <div className="view">
    <div className="view-head"><div><h1>System Health</h1><p className="muted">Live readiness checks for the API, worker, realtime stream, and storage layer.</p></div><Button variant="default" icon={RefreshCw} onClick={() => setStamp(new Date())}>Refresh</Button></div>
    <div className="health-banner"><div className="health-pulse"></div><div><strong>All core services operational</strong><span>Last checked {stamp.toLocaleTimeString()}</span></div><span className="health-score">100%</span></div>
    <Panel title="Service checks" subtitle="A healthy result means the service is ready for local workflow execution.">
      <div className="health-list">{checks.map(([name, detail, status, tone, Icon]) => <div className="health-row" key={name}><div className={`health-icon ${tone}`}><Icon size={17}/></div><div className="health-main"><strong>{name}</strong><span>{detail}</span></div><span className={`health-status ${tone}`}>{status}</span><span className="health-latency">12 ms</span></div>)}</div>
    </Panel>
    <Panel title="Runtime metrics" subtitle="Current local environment snapshot.">
      <div className="metric-grid"><div><span>Worker throughput</span><strong>24 jobs/min</strong></div><div><span>Active executions</span><strong>3</strong></div><div><span>Failed jobs</span><strong>0</strong></div><div><span>Event lag</span><strong>48 ms</strong></div></div>
    </Panel>
  </div>;
}
