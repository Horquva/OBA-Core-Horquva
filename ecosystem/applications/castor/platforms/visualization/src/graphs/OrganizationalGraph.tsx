import {
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  KeyboardEvent,
  PointerEvent,
  WheelEvent,
} from "react";

import type {
  GraphEdge,
  GraphNode,
  VisualizationBaseProps,
} from "../contracts/visualization.types";

import { VisualizationState } from "../states/VisualizationState";

export interface OrganizationalGraphProps
  extends VisualizationBaseProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  title?: string;
  interactionLabel?: string;
  onNodeSelect?: (node: GraphNode) => void;
}

type NodePosition = {
  x: number;
  y: number;
};

type PanPosition = {
  x: number;
  y: number;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};

type NodeTypeFilter =
  | "all"
  | "person"
  | "team"
  | "project"
  | "knowledge"
  | "entity";

const CHART_WIDTH = 800;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.15;

const nodeColors: Record<string, string> = {
  person: "#2563eb",
  team: "#7c3aed",
  project: "#0891b2",
  knowledge: "#059669",
  entity: "#d97706",
};

const clamp = (
  value: number,
  minimum: number,
  maximum: number,
) => Math.min(Math.max(value, minimum), maximum);

export function OrganizationalGraph({
  nodes,
  edges,
  title = "Organizational Graph",
  accessibleLabel,
  state = "ready",
  width = "100%",
  height = 420,
  interactionLabel = "organizational graph",
  onNodeSelect,
}: OrganizationalGraphProps) {
  const [query, setQuery] = useState("");
  const [nodeType, setNodeType] =
    useState<NodeTypeFilter>("all");
  const [selectedNodeId, setSelectedNodeId] = useState<
    string | null
  >(null);
  const [focusedNodeId, setFocusedNodeId] = useState<
    string | null
  >(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<PanPosition>({
    x: 0,
    y: 0,
  });
  const [dragState, setDragState] =
    useState<DragState | null>(null);

  const nodeRefs = useRef(
    new Map<string, SVGGElement>(),
  );

  const chartHeight =
    typeof height === "number"
      ? Math.max(height, 280)
      : 420;

  const normalizedQuery = query
    .trim()
    .toLowerCase();

  /*
   * Type filtering controls which nodes are displayed.
   * Search does not remove nodes; it highlights matches.
   */
  const visibleNodes = useMemo(() => {
    if (nodeType === "all") {
      return nodes;
    }

    return nodes.filter(
      (node) => node.type === nodeType,
    );
  }, [nodes, nodeType]);

  const visibleNodeIds = useMemo(
    () => new Set(visibleNodes.map((node) => node.id)),
    [visibleNodes],
  );

  const visibleEdges = useMemo(
    () =>
      edges.filter(
        (edge) =>
          visibleNodeIds.has(edge.source) &&
          visibleNodeIds.has(edge.target),
      ),
    [edges, visibleNodeIds],
  );

  const isSearchMatch = (node: GraphNode) =>
    normalizedQuery.length > 0 &&
    node.label
      .toLowerCase()
      .includes(normalizedQuery);

  const positions = useMemo(() => {
    const result = new Map<string, NodePosition>();
    const centerX = CHART_WIDTH / 2;
    const centerY = chartHeight / 2;
    const orbit =
      Math.min(CHART_WIDTH, chartHeight) * 0.32;

    visibleNodes.forEach((node, index) => {
      if (visibleNodes.length === 1) {
        result.set(node.id, {
          x: centerX,
          y: centerY,
        });

        return;
      }

      const angle =
        (index / visibleNodes.length) *
          Math.PI *
          2 -
        Math.PI / 2;

      result.set(node.id, {
        x: centerX + Math.cos(angle) * orbit,
        y: centerY + Math.sin(angle) * orbit,
      });
    });

    return result;
  }, [visibleNodes, chartHeight]);

  const handleNodeSelect = (node: GraphNode) => {
    setSelectedNodeId(node.id);
    setFocusedNodeId(node.id);
    onNodeSelect?.(node);
  };

  const focusNodeAtIndex = (index: number) => {
    if (visibleNodes.length === 0) {
      return;
    }

    const wrappedIndex =
      (index + visibleNodes.length) %
      visibleNodes.length;

    const targetNode = visibleNodes[wrappedIndex];

    if (!targetNode) {
      return;
    }

    setFocusedNodeId(targetNode.id);
    nodeRefs.current
      .get(targetNode.id)
      ?.focus();
  };

  const handleNodeKeyDown = (
    event: KeyboardEvent<SVGGElement>,
    node: GraphNode,
  ) => {
    const currentIndex = visibleNodes.findIndex(
      (visibleNode) => visibleNode.id === node.id,
    );

    const safeCurrentIndex =
      currentIndex >= 0 ? currentIndex : 0;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        focusNodeAtIndex(safeCurrentIndex + 1);
        break;

      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        focusNodeAtIndex(safeCurrentIndex - 1);
        break;

      case "Home":
        event.preventDefault();
        focusNodeAtIndex(0);
        break;

      case "End":
        event.preventDefault();
        focusNodeAtIndex(visibleNodes.length - 1);
        break;

      case "Enter":
      case " ":
        event.preventDefault();
        handleNodeSelect(node);
        break;

      case "Escape":
        event.preventDefault();
        setSelectedNodeId(null);
        break;

      default:
        break;
    }
  };

  const handleZoomIn = () => {
    setZoom((currentZoom) =>
      clamp(
        currentZoom + ZOOM_STEP,
        MIN_ZOOM,
        MAX_ZOOM,
      ),
    );
  };

  const handleZoomOut = () => {
    setZoom((currentZoom) =>
      clamp(
        currentZoom - ZOOM_STEP,
        MIN_ZOOM,
        MAX_ZOOM,
      ),
    );
  };

  const resetView = () => {
    setZoom(1);
    setPan({
      x: 0,
      y: 0,
    });
    setSelectedNodeId(null);
    setFocusedNodeId(null);
  };

  const handleWheel = (
    event: WheelEvent<SVGSVGElement>,
  ) => {
    event.preventDefault();

    const direction =
      event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;

    setZoom((currentZoom) =>
      clamp(
        currentZoom + direction,
        MIN_ZOOM,
        MAX_ZOOM,
      ),
    );
  };

  const handlePointerDown = (
    event: PointerEvent<SVGSVGElement>,
  ) => {
    event.currentTarget.setPointerCapture(
      event.pointerId,
    );

    setDragState({
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
    });
  };

  const handlePointerMove = (
    event: PointerEvent<SVGSVGElement>,
  ) => {
    if (
      !dragState ||
      dragState.pointerId !== event.pointerId
    ) {
      return;
    }

    setPan({
      x:
        dragState.originX +
        event.clientX -
        dragState.startX,
      y:
        dragState.originY +
        event.clientY -
        dragState.startY,
    });
  };

  const handlePointerUp = (
    event: PointerEvent<SVGSVGElement>,
  ) => {
    if (
      dragState?.pointerId === event.pointerId &&
      event.currentTarget.hasPointerCapture(
        event.pointerId,
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId,
      );
    }

    setDragState(null);
  };

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
          background: "#ffffff",
          color: "#344054",
        }}
      >
        <header
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: 18,
                color: "#101828",
              }}
            >
              {title}
            </h3>

            <p
              style={{
                margin: "4px 0 0",
                color: "#667085",
                fontSize: 13,
              }}
            >
              {visibleNodes.length} nodes and{" "}
              {visibleEdges.length} relationships
            </p>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 8,
            }}
          >
            <input
              type="search"
              aria-label={`Search ${interactionLabel}`}
              placeholder="Search nodes"
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              style={{
                minWidth: 190,
                padding: "8px 10px",
                border: "1px solid #d0d5dd",
                borderRadius: 8,
                color: "#101828",
                background: "#ffffff",
              }}
            />

            <select
              aria-label={`Filter ${interactionLabel} by node type`}
              value={nodeType}
              onChange={(event) =>
                setNodeType(
                  event.target.value as NodeTypeFilter,
                )
              }
              style={{
                padding: "8px 10px",
                border: "1px solid #d0d5dd",
                borderRadius: 8,
                color: "#101828",
                background: "#ffffff",
              }}
            >
              <option value="all">All nodes</option>
              <option value="person">People</option>
              <option value="team">Teams</option>
              <option value="project">Projects</option>
              <option value="knowledge">
                Knowledge
              </option>
              <option value="entity">Entities</option>
            </select>

            <button
              type="button"
              aria-label={`Zoom out ${interactionLabel}`}
              onClick={handleZoomOut}
            >
              −
            </button>

            <output
              aria-label={`${interactionLabel} zoom level`}
              style={{
                minWidth: 48,
                textAlign: "center",
                fontSize: 13,
              }}
            >
              {Math.round(zoom * 100)}%
            </output>

            <button
              type="button"
              aria-label={`Zoom in ${interactionLabel}`}
              onClick={handleZoomIn}
            >
              +
            </button>

            <button
              type="button"
              onClick={resetView}
            >
              Reset
            </button>
          </div>
        </header>

        {visibleNodes.length === 0 ? (
          <div
            role="status"
            style={{
              display: "grid",
              placeItems: "center",
              minHeight: chartHeight,
              border: "1px dashed #d0d5dd",
              borderRadius: 10,
              color: "#667085",
            }}
          >
            No {interactionLabel} nodes available.
          </div>
        ) : (
          <svg
            role="img"
            aria-label={`${accessibleLabel} visualization`}
            viewBox={`0 0 ${CHART_WIDTH} ${chartHeight}`}
            width="100%"
            height={chartHeight}
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              display: "block",
              overflow: "hidden",
              touchAction: "none",
              cursor: dragState
                ? "grabbing"
                : "grab",
              border: "1px solid #eaecf0",
              borderRadius: 10,
              background: "#f8fafc",
            }}
          >
            <title>{accessibleLabel}</title>

            <g
              transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}
            >
              {visibleEdges.map((edge) => {
                const sourcePosition =
                  positions.get(edge.source);
                const targetPosition =
                  positions.get(edge.target);

                if (
                  !sourcePosition ||
                  !targetPosition
                ) {
                  return null;
                }

                return (
                  <line
                    key={edge.id}
                    x1={sourcePosition.x}
                    y1={sourcePosition.y}
                    x2={targetPosition.x}
                    y2={targetPosition.y}
                    stroke="#98a2b3"
                    strokeWidth={
                      edge.weight
                        ? clamp(
                            edge.weight,
                            1,
                            5,
                          )
                        : 2
                    }
                    opacity={0.7}
                  >
                    <title>
                      {edge.label ??
                        `${interactionLabel} relationship`}
                    </title>
                  </line>
                );
              })}

              {visibleNodes.map((node) => {
                const position = positions.get(node.id);

                if (!position) {
                  return null;
                }

                const selected =
                  node.id === selectedNodeId;
                const focused =
                  node.id === focusedNodeId;
                const searchMatch =
                  isSearchMatch(node);

                const fill =
                  nodeColors[node.type] ??
                  "#64748b";

                const stroke = searchMatch
                  ? "#f59e0b"
                  : selected
                    ? "#101828"
                    : focused
                      ? "#38bdf8"
                      : "#ffffff";

                return (
                  <g
                    key={node.id}
                    ref={(element) => {
                      if (element) {
                        nodeRefs.current.set(
                          node.id,
                          element,
                        );
                      } else {
                        nodeRefs.current.delete(
                          node.id,
                        );
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${node.type}: ${node.label}`}
                    aria-pressed={selected}
                    data-search-match={
                      searchMatch
                        ? "true"
                        : "false"
                    }
                    transform={`translate(${position.x} ${position.y})`}
                    onClick={() =>
                      handleNodeSelect(node)
                    }
                    onFocus={() =>
                      setFocusedNodeId(node.id)
                    }
                    onKeyDown={(event) =>
                      handleNodeKeyDown(
                        event,
                        node,
                      )
                    }
                    style={{
  cursor: "pointer",
  outline: "none",
  opacity:
    normalizedQuery.length === 0 || searchMatch ? 1 : 0.22,
}}
                  >
                    {searchMatch && (
                      <circle
                        r={38}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth={3}
                        opacity={0.45}
                      />
                    )}

                    <circle
                      r={
                        selected || searchMatch
                          ? 31
                          : 26
                      }
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={
                        selected ||
                        searchMatch ||
                        focused
                          ? 4
                          : 3
                      }
                    />

                    <text
                      y={45}
                      textAnchor="middle"
                      fill="#344054"
                      fontSize={13}
                      fontWeight={600}
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
        )}

        <p
          style={{
            margin: "10px 0 0",
            color: "#667085",
            fontSize: 12,
          }}
        >
          Use arrow keys to move between nodes,
          Enter to select, mouse drag to pan, and
          the controls to zoom.
        </p>
      </section>
    </VisualizationState>
  );
}
