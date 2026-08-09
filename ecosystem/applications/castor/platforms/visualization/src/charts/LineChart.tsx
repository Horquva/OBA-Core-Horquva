import type {
  ChartSeries,
  VisualizationBaseProps,
} from "../contracts/visualization.types";
import { VisualizationState } from "../states/VisualizationState";

interface LineChartProps extends VisualizationBaseProps {
  series: ChartSeries[];
  title?: string;
  showLegend?: boolean;
}

export function LineChart({
  series,
  title,
  showLegend = true,
  state = "ready",
  width = "100%",
  height = 320,
  accessibleLabel,
}: LineChartProps) {
  if (state !== "ready") {
    return (
      <VisualizationState state={state}>
        <span />
      </VisualizationState>
    );
  }

  const hasData = series.some((item) => item.data.length > 0);

  if (!hasData) {
    return (
      <VisualizationState state="empty">
        <span />
      </VisualizationState>
    );
  }

  const chartWidth = 720;
  const padding = { top: 30, right: 24, bottom: 48, left: 56 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const values = series.flatMap((item) =>
    item.data.map((point) => point.y),
  );

  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum || 1;

  const longestSeriesLength = Math.max(
    ...series.map((item) => item.data.length),
    1,
  );

  const xPosition = (index: number) =>
    padding.left +
    (index / Math.max(longestSeriesLength - 1, 1)) * plotWidth;

  const yPosition = (value: number) =>
    padding.top + ((maximum - value) / range) * plotHeight;

  const gridLines = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4;

    return {
      y: padding.top + ratio * plotHeight,
      value: maximum - ratio * range,
    };
  });

  return (
    <figure
      aria-label={accessibleLabel}
      style={{
        width,
        margin: 0,
        padding: 16,
        boxSizing: "border-box",
        border: "1px solid #d9dde5",
        borderRadius: 12,
        background: "#ffffff",
      }}
    >
      {title && (
        <figcaption
          style={{
            marginBottom: 12,
            color: "#101828",
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          {title}
        </figcaption>
      )}

      <svg
        role="img"
        aria-label={accessibleLabel}
        viewBox={`0 0 ${chartWidth} ${height}`}
        width="100%"
        height={height}
        style={{ display: "block" }}
      >
        <title>{accessibleLabel}</title>

        {gridLines.map((line) => (
          <g key={line.y}>
            <line
              x1={padding.left}
              x2={chartWidth - padding.right}
              y1={line.y}
              y2={line.y}
              stroke="#eaecf0"
              strokeWidth="1"
            />

            <text
              x={padding.left - 10}
              y={line.y + 4}
              textAnchor="end"
              fill="#667085"
              fontSize="12"
            >
              {line.value.toFixed(1)}
            </text>
          </g>
        ))}

        {series.map((item, seriesIndex) => {
          const color = item.color ?? [
            "#2563eb",
            "#7c3aed",
            "#059669",
            "#dc2626",
          ][seriesIndex % 4];

          const points = item.data
            .map(
              (point, index) =>
                `${xPosition(index)},${yPosition(point.y)}`,
            )
            .join(" ");

          return (
            <g key={item.id}>
              <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {item.data.map((point, index) => (
                <circle
                  key={`${item.id}-${index}`}
                  cx={xPosition(index)}
                  cy={yPosition(point.y)}
                  r="4"
                  fill="#ffffff"
                  stroke={color}
                  strokeWidth="2"
                >
                  <title>
                    {point.label ?? point.x}: {point.y}
                  </title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>

      {showLegend && (
        <div
          aria-label="Chart legend"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            marginTop: 8,
          }}
        >
          {series.map((item, index) => {
            const color = item.color ?? [
              "#2563eb",
              "#7c3aed",
              "#059669",
              "#dc2626",
            ][index % 4];

            return (
              <span
                key={item.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  color: "#475467",
                  fontSize: 13,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: color,
                  }}
                />
                {item.label}
              </span>
            );
          })}
        </div>
      )}
    </figure>
  );
}