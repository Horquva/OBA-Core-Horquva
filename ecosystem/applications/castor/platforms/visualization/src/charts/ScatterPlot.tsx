import type {
  ChartSeries,
  VisualizationBaseProps,
} from "../contracts/visualization.types";
import { VisualizationState } from "../states/VisualizationState";

interface ScatterPlotProps extends VisualizationBaseProps {
  series: ChartSeries[];
  title?: string;
  showLegend?: boolean;
}

const defaultColors = ["#2563eb", "#7c3aed", "#059669", "#dc2626"];

export function ScatterPlot({
  series,
  title,
  showLegend = true,
  state = "ready",
  width = "100%",
  height = 320,
  accessibleLabel,
}: ScatterPlotProps) {
  if (state !== "ready") {
    return (
      <VisualizationState state={state}>
        <span />
      </VisualizationState>
    );
  }

  const points = series.flatMap((item) =>
    item.data.map((point, index) => ({
      ...point,
      seriesId: item.id,
      seriesLabel: item.label,
      color: item.color,
      numericX: typeof point.x === "number" ? point.x : index,
    })),
  );

  if (points.length === 0) {
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

  const minimumX = Math.min(...points.map((point) => point.numericX));
  const maximumX = Math.max(...points.map((point) => point.numericX));
  const minimumY = Math.min(...points.map((point) => point.y));
  const maximumY = Math.max(...points.map((point) => point.y));

  const rangeX = maximumX - minimumX || 1;
  const rangeY = maximumY - minimumY || 1;

  const xPosition = (value: number) =>
    padding.left + ((value - minimumX) / rangeX) * plotWidth;

  const yPosition = (value: number) =>
    padding.top + ((maximumY - value) / rangeY) * plotHeight;

  const gridLines = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4;

    return {
      y: padding.top + ratio * plotHeight,
      value: maximumY - ratio * rangeY,
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

        <line
          x1={padding.left}
          x2={padding.left}
          y1={padding.top}
          y2={height - padding.bottom}
          stroke="#98a2b3"
        />

        <line
          x1={padding.left}
          x2={chartWidth - padding.right}
          y1={height - padding.bottom}
          y2={height - padding.bottom}
          stroke="#98a2b3"
        />

        {points.map((point, index) => {
          const seriesIndex = series.findIndex(
            (item) => item.id === point.seriesId,
          );

          const color =
            point.color ??
            defaultColors[
              Math.max(seriesIndex, 0) % defaultColors.length
            ];

          return (
            <circle
              key={`${point.seriesId}-${index}`}
              cx={xPosition(point.numericX)}
              cy={yPosition(point.y)}
              r="6"
              fill={color}
              fillOpacity="0.78"
              stroke="#ffffff"
              strokeWidth="2"
            >
              <title>
                {point.seriesLabel} — {point.label ?? point.x}: {point.y}
              </title>
            </circle>
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
          {series.map((item, index) => (
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
                  background:
                    item.color ??
                    defaultColors[index % defaultColors.length],
                }}
              />
              {item.label}
            </span>
          ))}
        </div>
      )}
    </figure>
  );
}