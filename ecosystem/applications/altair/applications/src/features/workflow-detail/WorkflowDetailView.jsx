import React from "react";
import { Play, CheckCircle2 } from "lucide-react";
import { useAltair } from "../../context/AltairContext";
import { isActive } from "../../domain/status";
import { ViewHead } from "../../components/ui/ViewHead";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { CategoryTag } from "../../components/ui/CategoryTag";
import { WorkflowPipeline, PipelineTextList } from "../../components/workflow/WorkflowPipeline";
import { ExecutionRows } from "../../components/workflow/ExecutionRows";

export function WorkflowDetailView({ id, navigate }) {
  const { getWorkflow, executionsForWorkflow, can } = useAltair();
  const wf = getWorkflow(id);
  if (!wf) return <EmptyState title="Workflow not found" body="This workflow may have been removed or renamed." />;

  const runs = executionsForWorkflow(id);
  const activeRuns = runs.filter((e) => isActive(e.status));

  return (
    <div className="view">
      <ViewHead
        title={wf.name}
        subtitle={wf.description}
        right={
          <div className="button-row">
            {can("workflow:write") && <Button variant="ghost" onClick={() => navigate("builder", id)}>Edit workflow</Button>}
            {wf.availability === "available" && can("workflow:execute") ? (
              <Button variant="primary" icon={Play} onClick={() => navigate("initiate", id)}>Initiate workflow</Button>
            ) : (
              <Button variant="default" disabled title="This workflow is restricted for your role">Restricted</Button>
            )}
          </div>
        }
      />

      <div className="detail-grid">
        <Panel title="Identity">
          <dl className="def-list">
            <div><dt>Owner</dt><dd>{wf.owner.name} · {wf.owner.team}</dd></div>
            <div><dt>Category</dt><dd><CategoryTag category={wf.category} /></dd></div>
            <div><dt>Version</dt><dd className="mono">{wf.version}</dd></div>
            <div><dt>Availability</dt><dd className="capitalize">{wf.availability}</dd></div>
          </dl>
        </Panel>

        <Panel title="Trigger">
          <dl className="def-list">
            <div><dt>Type</dt><dd>{wf.trigger.type}</dd></div>
            <div><dt>Source</dt><dd>{wf.trigger.source}</dd></div>
          </dl>
          <p className="label-caps">Preconditions</p>
          <ul className="check-list">
            {wf.trigger.preconditions.map((p, i) => (
              <li key={i}><CheckCircle2 size={13} />{p}</li>
            ))}
          </ul>
        </Panel>

        <Panel title="Governance">
          <dl className="def-list">
            <div><dt>Approval required</dt><dd>{wf.approval.required ? `Yes — ${wf.approval.approverRole}` : "No"}</dd></div>
            <div><dt>Protected action</dt><dd>{wf.approval.protected ? "Yes — outcome is difficult to reverse" : "No"}</dd></div>
            <div><dt>Audit</dt><dd>Every state transition is recorded to the Audit Timeline</dd></div>
          </dl>
        </Panel>
      </div>

      <Panel title="Inputs">
        <div className="input-grid">
          <div>
            <p className="label-caps">Required</p>
            {wf.inputs.required.map((inp) => (
              <div key={inp.name} className="input-row">
                <span className="mono">{inp.name}</span>
                <span className="input-type">{inp.type}</span>
                <span className="muted">{inp.desc}</span>
              </div>
            ))}
          </div>
          {wf.inputs.optional.length > 0 && (
            <div>
              <p className="label-caps">Optional</p>
              {wf.inputs.optional.map((inp) => (
                <div key={inp.name} className="input-row">
                  <span className="mono">{inp.name}</span>
                  <span className="input-type">{inp.type}</span>
                  <span className="muted">{inp.desc}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Panel>

      <Panel title="Pipeline structure" subtitle="Trigger → Steps → Approval → Execution → Result">
        <WorkflowPipeline workflow={wf} execution={null} />
        <PipelineTextList workflow={wf} execution={null} />
      </Panel>

      <Panel title={`Active runs (${activeRuns.length})`} right={<Button size="sm" variant="ghost" onClick={() => navigate("history", null, { workflowId: id })}>Full history</Button>}>
        {activeRuns.length === 0 ? <EmptyState title="Nothing running" body="There are no in-flight executions of this workflow." /> : <ExecutionRows executions={activeRuns} navigate={navigate} />}
      </Panel>
    </div>
  );
}
