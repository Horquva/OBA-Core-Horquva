import type { ReactNode } from "react";
import type {
  VisualizationState as VisualizationStateName,
} from "../contracts/visualization.types";

interface VisualizationStateProps {
  state?: VisualizationStateName;
  message?: string;
  children: ReactNode;
}

const stateMessages: Record<
  Exclude<VisualizationStateName, "ready">,
  string
> = {
  idle: "Visualization is waiting for data.",
  loading: "Loading visualization…",
  empty: "No data is available.",
  partial: "Some visualization data is unavailable.",
  stale: "This visualization may be outdated.",
  invalid: "The visualization data is invalid.",
  unavailable: "This visualization is currently unavailable.",
  "permission-restricted": "You do not have permission to view this data.",
  error: "The visualization could not be displayed.",
};

export function VisualizationState({
  state = "ready",
  message,
  children,
}: VisualizationStateProps) {
  if (state === "ready") {
    return <>{children}</>;
  }

  return (
    <div
      role={state === "error" ? "alert" : "status"}
      aria-live="polite"
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: 160,
        padding: 24,
        border: "1px solid #d9dde5",
        borderRadius: 12,
        color: "#475467",
        background: "#f8fafc",
        textAlign: "center",
      }}
    >
      {message ?? stateMessages[state]}
    </div>
  );
}