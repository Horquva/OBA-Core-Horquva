import React from "react";
import { ChevronRight } from "lucide-react";
import { WF } from "../../data/workflows";
import { Badge } from "../ui/Badge";
import { CategoryTag } from "../ui/CategoryTag";
import { fmtTime, timeAgo } from "../../utils/datetime";

export function ExecutionTable({ rows, navigate }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Workflow</th>
            <th>Execution</th>
            <th>Initiator</th>
            <th>Status</th>
            <th>Started</th>
            <th>Updated</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((ex) => (
            <tr key={ex.id} onClick={() => navigate("execution", ex.id)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && navigate("execution", ex.id)}>
              <td>
                <div className="table-wf">
                  <span>{WF[ex.workflowId].name}</span>
                  <CategoryTag category={WF[ex.workflowId].category} />
                </div>
              </td>
              <td className="mono">{ex.id}</td>
              <td>{ex.initiator.name}</td>
              <td><Badge status={ex.status} size="sm" /></td>
              <td>{fmtTime(ex.startedAt)}</td>
              <td>{timeAgo(ex.updatedAt)}</td>
              <td><ChevronRight size={14} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
