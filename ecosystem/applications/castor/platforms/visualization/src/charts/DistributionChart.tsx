import type { VisualizationBaseProps } from "../contracts/visualization.types";
import { VisualizationState } from "../states/VisualizationState";

interface DistributionChartProps extends VisualizationBaseProps {
  values: number[];
  title?: string;
  binCount?: number;
  color?: string;
}

export function DistributionChart({
  values,
  title,
  binCount = 8,
  color = "#2563eb",
  state = "ready",
  width = "100%",
  height = 320,
  accessibleLabel,
}: DistributionChartProps) {
  if (state !== "ready") {
    return (
      <VisualizationState state={state}>
        <span />
      </VisualizationState>
    );
  }

  if (values.length === 0) {
    return (
      <VisualizationState state="empty">
        <span />
      </VisualizationState>
    );
  }

  const safeBinCount = Math.max(1, Math.floor(binCount));
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const valueRange = maximum - minimum || 1;
  const binSize = valueRange / safeBinCount;

  const counts = Array.from({ length: safeBinCount }, () => 0);

  values.forEach((value) => {
    const calculatedIndex = Math.floor((value - minimum) / binSize);
    const index = Math.min(calculatedIndex, safeBinCount - 1);
    counts[index] = (counts[index] ?? 0) + 1;
  });

  const bins = counts.map((count, index) => ({
    count,
    start: minimum + index * binSize,
    end: minimum + (index + 1) * binSize,
  }));

  const maximumCount = Math.max(...counts, 1);
  const chartWidth = 720;
  const padding = { top: 30, right: 24, bottom: 58, left: 56 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const barWidth = plotWidth / safeBinCount;

  const yPosition = (count: number) =>
    padding.top + ((maximumCount - count) / maximumCount) * plotHeight;

  const gridLines = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4;

    return {
      y: padding.top + ratio * plotHeight,
      value: maximumCount * (1 - ratio),
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
              {line.value.toFixed(0)}
            </text>
          </g>
        ))}

        {bins.map((bin, index) => {
          const barHeight =
            height - padding.bottom - yPosition(bin.count);

          return (
            <rect
              key={`${bin.start}-${index}`}
              x={padding.left + index * barWidth + 2}
              y={yPosition(bin.count)}
              width={Math.max(barWidth - 4, 2)}
              height={Math.max(barHeight, 1)}
              rx="3"
              fill={color}
              fillOpacity="0.82"
            >
              <title>
                {bin.start.toFixed(1)}–{bin.end.toFixed(1)}:{" "}
                {bin.count} values
              </title>
            </rect>
          );
        })}

        <text
          x={padding.left}
          y={height - 22}
          textAnchor="start"
          fill="#667085"
          fontSize="12"
        >
          {minimum.toFixed(1)}
        </text>

        <text
          x={chartWidth - padding.right}
          y={height - 22}
          textAnchor="end"
          fill="#667085"
          fontSize="12"
        >
          {maximum.toFixed(1)}
        </text>
      </svg>
    </figure>
  );
}