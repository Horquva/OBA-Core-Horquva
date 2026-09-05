import React from "react";
import { CheckCircle2, Loader2, Clock, AlertTriangle, RotateCcw, XCircle, Circle } from "lucide-react";
import { STATUS, isTerminal, statusMeta } from "../../domain/status";
import { buildPipeline } from "../../domain/pipeline";
import { WF } from "../../data/workflows";

/**
 * Workflow pipeline visualization — the platform's signature element.
 * Renders Trigger → Steps → Approval → Execution → Result as a node chain,
 * coloring each node from the execution's current status.
 */
function nodeState(node, execution) {
  const pipeline = buildPipeline(WF[execution.workflowId]);
  const curIdx = pipeline.findIndex((n) => n.id === execution.currentNodeId);
  const nodeIdx = pipeline.findIndex((n) => n.id === node.id);

  if (execution.status === STATUS.rejected) {
    if (node.kind === "approval") return "rejected";
    return nodeIdx < curIdx ? "done" : nodeIdx === curIdx ? "rejected" : "skipped";
  }
  if (nodeIdx < curIdx) return "done";
  if (nodeIdx > curIdx) return isTerminal(execution.status) ? "done" : "pending";
  // nodeIdx === curIdx
  if (execution.status === STATUS.failed) return "failed";
  if (execution.status === STATUS.retrying) return "retrying";
  if (execution.status === STATUS.pending_approval) return "waiting";
  if (execution.status === STATUS.completed) return "done";
  return "active";
}

const NODE_STYLE = {
  done: { tone: "green", icon: CheckCircle2 },
  active: { tone: "blue", icon: Loader2, spin: true },
  waiting: { tone: "purple", icon: Clock },
  failed: { tone: "red", icon: AlertTriangle },
  retrying: { tone: "amber", icon: RotateCcw },
  rejected: { tone: "red", icon: XCircle },
  pending: { tone: "muted", icon: Circle },
  skipped: { tone: "muted", icon: Circle },
};

export function WorkflowPipeline({ workflow, execution }) {
  const pipeline = buildPipeline(workflow);
  const ariaLabel = execution
    ? `Workflow pipeline for ${workflow.name}, currently ${statusMeta(execution.status).label}`
    : `Workflow pipeline structure for ${workflow.name}`;
  return (
    <div className="pipeline" role="img" aria-label={ariaLabel}>
      {pipeline.map((node, i) => {
        const state = execution ? nodeState(node, execution) : "pending";
        const style = NODE_STYLE[state];
        const Icon = style.icon;
        const label = node.kind === "trigger" ? "Trigger" : node.kind === "result" ? "Result" : node.kind === "approval" ? "Approval" : node.name;
        return (
          <React.Fragment key={node.id}>
            <div className={`pipe-node tone-${style.tone} state-${state}`}>
              <div className="pipe-node-icon">
                <Icon size={15} className={style.spin ? "spin" : ""} />
              </div>
              <div className="pipe-node-label">
                <span className="pipe-node-kind">{node.kind}</span>
                <span>{label}</span>
              </div>
            </div>
            {i < pipeline.length - 1 && <div className={`pipe-connector ${state === "done" ? "done" : ""}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/** Accessible textual fallback / companion for the pipeline (screen readers). */
export function PipelineTextList({ workflow, execution }) {
  const pipeline = buildPipeline(workflow);
  return (
    <ol className="pipeline-text sr-companion">
      {pipeline.map((node) => {
        const state = execution ? nodeState(node, execution) : "pending";
        return (
          <li key={node.id}>
            {node.kind === "trigger" ? "Trigger" : node.kind === "result" ? "Result" : node.name} — {state}
          </li>
        );
      })}
    </ol>
  );
}
