import type {
  MetricData,
  VisualizationBaseProps,
} from "../contracts/visualization.types";
import { VisualizationState } from "../states/VisualizationState";

interface MetricProps extends VisualizationBaseProps {
  data: MetricData;
  description?: string;
}

export function Metric({
  data,
  description,
  state = "ready",
  width = "100%",
  accessibleLabel,
}: MetricProps) {
  const formattedValue = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(data.value);

  return (
    <VisualizationState state={state}>
      <article
        aria-label={accessibleLabel}
        title={description}
        style={{
          width,
          boxSizing: "border-box",
          padding: 20,
          border: "1px solid #d9dde5",
          borderRadius: 12,
          background: "#ffffff",
          color: "#101828",
        }}
      >
        <header
          style={{
            marginBottom: 12,
            color: "#667085",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {data.label}
        </header>

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 6,
          }}
        >
          <strong style={{ fontSize: 32, lineHeight: 1.2 }}>
            {formattedValue}
          </strong>

          {data.unit && (
            <span style={{ color: "#667085", fontSize: 14 }}>
              {data.unit}
            </span>
          )}
        </div>

        {data.metadata?.updatedAt && (
          <footer
            style={{
              marginTop: 12,
              color: "#98a2b3",
              fontSize: 12,
            }}
          >
            Updated: {data.metadata.updatedAt}
          </footer>
        )}
      </article>
    </VisualizationState>
  );
}