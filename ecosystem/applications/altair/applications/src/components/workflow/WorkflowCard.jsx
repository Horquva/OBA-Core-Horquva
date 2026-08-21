import React from "react";
import { Users, ShieldCheck } from "lucide-react";
import { useAltair } from "../../context/AltairContext";
import { isActive } from "../../domain/status";
import { CategoryTag } from "../ui/CategoryTag";

export function WorkflowCard({ workflow, navigate }) {
  const { executionsForWorkflow } = useAltair();
  const live = executionsForWorkflow(workflow.id).filter((e) => isActive(e.status)).length;
  return (
    <button className="wf-card" onClick={() => navigate("workflow", workflow.id)}>
      <div className="wf-card-top">
        <CategoryTag category={workflow.category} />
        {workflow.availability !== "available" && <span className="chip-restricted">{workflow.availability}</span>}
      </div>
      <h4>{workflow.name}</h4>
      <p className="muted clamp2">{workflow.description}</p>
      <div className="wf-card-meta">
        <span><Users size={12} /> {workflow.owner.name}</span>
        <span><ShieldCheck size={12} /> {workflow.approval.required ? `Requires ${workflow.approval.approverRole}` : "No approval"}</span>
      </div>
      {live > 0 && <div className="wf-card-live"><span className="dot blue" /> {live} running now</div>}
    </button>
  );
}
