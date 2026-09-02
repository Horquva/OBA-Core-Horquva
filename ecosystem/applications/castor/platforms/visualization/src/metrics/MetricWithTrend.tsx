import type {
  MetricData,
  VisualizationBaseProps,
} from "../contracts/visualization.types";
import { Metric } from "./Metric";

interface MetricWithTrendProps extends VisualizationBaseProps {
  data: MetricData;
  description?: string;
}

export function MetricWithTrend({
  data,
  description,
  state = "ready",
  width = "100%",
  accessibleLabel,
}: MetricWithTrendProps) {
  const trend = data.trend ?? 0;
  const direction =
    trend > 0 ? "increase" : trend < 0 ? "decrease" : "no change";

  const color =
    trend > 0 ? "#067647" : trend < 0 ? "#b42318" : "#475467";

  const background =
    trend > 0 ? "#ecfdf3" : trend < 0 ? "#fef3f2" : "#f2f4f7";

  const symbol = trend > 0 ? "↑" : trend < 0 ? "↓" : "→";

  return (
    <div
      style={{
        position: "relative",
        width,
      }}
    >
      <Metric
        data={data}
        description={description ?? `${data.label} with trend`}
        state={state}
        width="100%"
        accessibleLabel={`${accessibleLabel}. Trend: ${direction} ${Math.abs(
          trend,
        )} percent.`}
      />

      {state === "ready" && (
        <span
          aria-label={`${direction} ${Math.abs(trend)} percent`}
          title={`${direction} ${Math.abs(trend)}%`}
          style={{
            position: "absolute",
            top: 18,
            right: 18,
            padding: "4px 8px",
            borderRadius: 999,
            color,
            background,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {symbol} {Math.abs(trend)}%
        </span>
      )}
    </div>
  );
}