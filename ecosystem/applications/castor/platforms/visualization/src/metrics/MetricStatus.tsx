import type {
  MetricData,
  MetricStatus as MetricStatusName,
  VisualizationBaseProps,
} from "../contracts/visualization.types";
import { Metric } from "./Metric";

interface MetricStatusProps extends VisualizationBaseProps {
  data: MetricData;
  description?: string;
}

const statusStyles: Record<
  MetricStatusName,
  { label: string; color: string; background: string }
> = {
  positive: {
    label: "Positive",
    color: "#067647",
    background: "#ecfdf3",
  },
  negative: {
    label: "Negative",
    color: "#b42318",
    background: "#fef3f2",
  },
  warning: {
    label: "Warning",
    color: "#b54708",
    background: "#fffaeb",
  },
  neutral: {
    label: "Neutral",
    color: "#475467",
    background: "#f2f4f7",
  },
};

export function MetricStatus({
  data,
  description,
  state = "ready",
  width = "100%",
  accessibleLabel,
}: MetricStatusProps) {
  const status = data.status ?? "neutral";
  const appearance = statusStyles[status];

  return (
    <div style={{ position: "relative", width }}>
      <Metric
        data={data}
        description={description ?? `${data.label} status`}
        state={state}
        width="100%"
        accessibleLabel={`${accessibleLabel}. Status: ${appearance.label}.`}
      />

      {state === "ready" && (
        <span
          aria-label={`Status: ${appearance.label}`}
          style={{
            position: "absolute",
            top: 18,
            right: 18,
            padding: "4px 9px",
            borderRadius: 999,
            color: appearance.color,
            background: appearance.background,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {appearance.label}
        </span>
      )}
    </div>
  );
}