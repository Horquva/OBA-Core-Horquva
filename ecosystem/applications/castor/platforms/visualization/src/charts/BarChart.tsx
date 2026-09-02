import type {
  ChartSeries,
  VisualizationBaseProps,
} from "../contracts/visualization.types";
import { VisualizationState } from "../states/VisualizationState";

interface BarChartProps extends VisualizationBaseProps {
  series: ChartSeries[];
  title?: string;
  showLegend?: boolean;
}

const defaultColors = ["#2563eb", "#7c3aed", "#059669", "#dc2626"];

export function BarChart({
  series,
  title,
  showLegend = true,
  state = "ready",
  width = "100%",
  height = 320,
  accessibleLabel,
}: BarChartProps) {
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
  const padding = { top: 30, right: 24, bottom: 58, left: 56 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const values = series.flatMap((item) =>
    item.data.map((point) => point.y),
  );

  const minimum = Math.min(0, ...values);
  const maximum = Math.max(0, ...values);
  const range = maximum - minimum || 1;

  const categorySource = series.reduce<ChartSeries | undefined>(
    (longest, current) =>
      !longest || current.data.length > longest.data.length
        ? current
        : longest,
    undefined,
  );

  const categories = categorySource?.data ?? [];
  const groupWidth = plotWidth / Math.max(categories.length, 1);
  const innerGroupWidth = groupWidth * 0.8;
  const barWidth = innerGroupWidth / Math.max(series.length, 1);

  const yPosition = (value: number) =>
    padding.top + ((maximum - value) / range) * plotHeight;

  const baseline = yPosition(0);

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
          x2={chartWidth - padding.right}
          y1={baseline}
          y2={baseline}
          stroke="#98a2b3"
        />

        {series.flatMap((item, seriesIndex) => {
          const color =
            item.color ?? defaultColors[seriesIndex % defaultColors.length];

          return item.data.map((point, categoryIndex) => {
            const valueY = yPosition(point.y);
            const barHeight = Math.abs(baseline - valueY);
            const x =
              padding.left +
              categoryIndex * groupWidth +
              groupWidth * 0.1 +
              seriesIndex * barWidth;

            return (
              <rect
                key={`${item.id}-${categoryIndex}`}
                x={x}
                y={Math.min(valueY, baseline)}
                width={Math.max(barWidth - 3, 2)}
                height={Math.max(barHeight, 1)}
                rx="3"
                fill={color}
              >
                <title>
                  {item.label} — {point.label ?? point.x}: {point.y}
                </title>
              </rect>
            );
          });
        })}

        {categories.map((category, index) => (
          <text
            key={`${category.x}-${index}`}
            x={padding.left + index * groupWidth + groupWidth / 2}
            y={height - 22}
            textAnchor="middle"
            fill="#667085"
            fontSize="12"
          >
            {category.label ?? category.x}
          </text>
        ))}
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
                  borderRadius: 2,
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