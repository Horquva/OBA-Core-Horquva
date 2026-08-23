import { useState } from "react";
import type {
  GraphEdge,
  GraphNode,
  VisualizationBaseProps,
} from "../contracts/visualization.types";
import { VisualizationState } from "../states/VisualizationState";

interface OrganizationalGraphProps extends VisualizationBaseProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  title?: string;
  onNodeSelect?: (node: GraphNode) => void;
}

const nodeColors: Record<GraphNode["type"], string> = {
  person: "#2563eb",
  team: "#7c3aed",
  project: "#059669",
  knowledge: "#d97706",
  entity: "#475467",
};

const controlStyle = {
  padding: "6px 10px",
  border: "1px solid #d0d5dd",
  borderRadius: 8,
  background: "#ffffff",
  color: "#344054",
  cursor: "pointer",
} as const;

export function OrganizationalGraph({
  nodes,
  edges,
  title,
  onNodeSelect,
  state = "ready",
  width = "100%",
  height = 480,
  accessibleLabel,
}: OrganizationalGraphProps) {
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    null,
  );

  if (state !== "ready") {
    return (
      <VisualizationState state={state}>
        <span />
      </VisualizationState>
    );
  }

  if (nodes.length === 0) {
    return (
      <VisualizationState state="empty">
        <span />
      </VisualizationState>
    );
  }

  const normalizedQuery = query.trim().toLowerCase();
  const visibleNodes = nodes;

  const isSearchMatch = (node: GraphNode) =>
    normalizedQuery.length > 0 &&
    node.label.toLowerCase().includes(normalizedQuery);

  const chartWidth = 800;
  const centerX = chartWidth / 2;
  const centerY = height / 2;
  const orbit = Math.min(chartWidth, height) * 0.32;

  const positions = new Map(
    visibleNodes.map((node, index) => {
      if (visibleNodes.length === 1) {
        return [node.id, { x: centerX, y: centerY }] as const;
      }

      const angle =
        (index / visibleNodes.length) * Math.PI * 2 - Math.PI / 2;

      return [
        node.id,
        {
          x: centerX + Math.cos(angle) * orbit,
          y: centerY + Math.sin(angle) * orbit,
        },
      ] as const;
    }),
  );

  const handleNodeSelect = (node: GraphNode) => {
    setSelectedNodeId(node.id);
    onNodeSelect?.(node);
  };

  return (
    <section
      aria-label={accessibleLabel}
      style={{
        width,
        boxSizing: "border-box",
        padding: 16,
        border: "1px solid #d9dde5",
        borderRadius: 12,
        background: "#ffffff",
      }}
    >
      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
        }}
      >
        {title && (
          <h3
            style={{
              margin: 0,
              color: "#101828",
              fontSize: 16,
            }}
          >
            {title}
          </h3>
        )}

        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search people or teams"
          aria-label="Search organizational graph"
          style={{
            minWidth: 220,
            padding: "7px 10px",
            border: "1px solid #d0d5dd",
            borderRadius: 8,
          }}
        />
      </header>

      <div
        aria-label="Graph controls"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 10,
        }}
      >
        <button
          type="button"
          style={controlStyle}
          onClick={() =>
            setZoom((currentZoom) => Math.min(currentZoom + 0.2, 2))
          }
        >
          Zoom in
        </button>

        <button
          type="button"
          style={controlStyle}
          onClick={() =>
            setZoom((currentZoom) => Math.max(currentZoom - 0.2, 0.5))
          }
        >
          Zoom out
        </button>

        <button
          type="button"
          style={controlStyle}
          onClick={() =>
            setPan((currentPan) => ({
              ...currentPan,
              x: currentPan.x - 30,
            }))
          }
        >
          Pan left
        </button>

        <button
          type="button"
          style={controlStyle}
          onClick={() =>
            setPan((currentPan) => ({
              ...currentPan,
              x: currentPan.x + 30,
            }))
          }
        >
          Pan right
        </button>

        <button
          type="button"
          style={controlStyle}
          onClick={() =>
            setPan((currentPan) => ({
              ...currentPan,
              y: currentPan.y - 30,
            }))
          }
        >
          Pan up
        </button>

        <button
          type="button"
          style={controlStyle}
          onClick={() =>
            setPan((currentPan) => ({
              ...currentPan,
              y: currentPan.y + 30,
            }))
          }
        >
          Pan down
        </button>

        <button
          type="button"
          style={controlStyle}
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
        >
          Reset
        </button>
      </div>

      <svg
        role="img"
        aria-label={accessibleLabel}
        viewBox={`0 0 ${chartWidth} ${height}`}
        width="100%"
        height={height}
        style={{
          display: "block",
          borderRadius: 8,
          background: "#f8fafc",
        }}
      >
        <title>{accessibleLabel}</title>

        <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
          {edges.map((edge) => {
            const source = positions.get(edge.source);
            const target = positions.get(edge.target);

            if (!source || !target) {
              return null;
            }

            return (
              <line
                key={edge.id}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="#98a2b3"
                strokeWidth={edge.weight ?? 2}
              >
                <title>
                  {edge.label ?? "Organizational relationship"}
                </title>
              </line>
            );
          })}

          {visibleNodes.map((node) => {
            const position = positions.get(node.id);

            if (!position) {
              return null;
            }

            const selected = node.id === selectedNodeId;
            const searchMatch = isSearchMatch(node);

            return (
              <g
                key={node.id}
                role="button"
                tabIndex={0}
                aria-label={`${node.type}: ${node.label}`}
                aria-pressed={selected}
                transform={`translate(${position.x} ${position.y})`}
                onClick={() => handleNodeSelect(node)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleNodeSelect(node);
                  }
                }}
                style={{
                  cursor: "pointer",
                  opacity:
                    normalizedQuery.length === 0 || searchMatch
                      ? 1
                      : 0.22,
                  transition: "opacity 160ms ease",
                }}
              >
                <circle
                  r={selected || searchMatch ? 31 : 26}
                  fill={nodeColors[node.type]}
                  stroke={
                    searchMatch
                      ? "#f59e0b"
                      : selected
                        ? "#101828"
                        : "#ffffff"
                  }
                  strokeWidth={selected || searchMatch ? 4 : 3}
                />

                <text
                  y="45"
                  textAnchor="middle"
                  fill="#344054"
                  fontSize="13"
                  fontWeight="600"
                >
                  {node.label}
                </text>

                <title>
                  {node.label} ({node.type})
                </title>
              </g>
            );
          })}
        </g>
      </svg>
    </section>
  );
}