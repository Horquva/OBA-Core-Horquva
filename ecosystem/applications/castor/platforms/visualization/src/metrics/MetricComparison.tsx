import type {
  MetricData,
  VisualizationBaseProps,
} from "../contracts/visualization.types";
import { VisualizationState } from "../states/VisualizationState";
import { Metric } from "./Metric";

interface MetricComparisonProps extends VisualizationBaseProps {
  primary: MetricData;
  comparison: MetricData;
}

export function MetricComparison({
  primary,
  comparison,
  state = "ready",
  width = "100%",
  accessibleLabel,
}: MetricComparisonProps) {
  const difference = primary.value - comparison.value;
  const differenceText =
    difference === 0
      ? "No difference"
      : `${difference > 0 ? "+" : ""}${difference.toFixed(2)}`;

  return (
    <VisualizationState state={state}>
      <section
        aria-label={accessibleLabel}
        style={{
          width,
          boxSizing: "border-box",
          padding: 16,
          border: "1px solid #d9dde5",
          borderRadius: 12,
          background: "#f8fafc",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          <Metric
            data={primary}
            state="ready"
            width="100%"
            accessibleLabel={`${primary.label}: ${primary.value}`}
          />

          <Metric
            data={comparison}
            state="ready"
            width="100%"
            accessibleLabel={`${comparison.label}: ${comparison.value}`}
          />
        </div>

        <footer
          style={{
            marginTop: 12,
            textAlign: "center",
            color: "#475467",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Difference: {differenceText}
        </footer>
      </section>
    </VisualizationState>
  );
}