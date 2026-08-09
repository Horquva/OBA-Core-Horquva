import { useMemo, useState } from "react";
import type {
  TimelineEvent,
  VisualizationBaseProps,
} from "../contracts/visualization.types";
import { VisualizationState } from "../states/VisualizationState";

interface MemoryTimelineProps extends VisualizationBaseProps {
  events: TimelineEvent[];
  title?: string;
  onEventSelect?: (event: TimelineEvent) => void;
}

export function MemoryTimeline({
  events,
  title = "Memory Timeline",
  state = "ready",
  width = "100%",
  height = 520,
  accessibleLabel,
  onEventSelect,
}: MemoryTimelineProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [zoom, setZoom] = useState(1);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          events
            .map((event) => event.category)
            .filter((value): value is string => Boolean(value)),
        ),
      ),
    [events],
  );

  const filteredEvents = useMemo(() => {
    const search = query.toLowerCase().trim();

    return [...events]
      .filter((event) => {
        const matchesCategory =
          category === "all" || event.category === category;

        const matchesSearch =
          !search ||
          event.title.toLowerCase().includes(search) ||
          event.description?.toLowerCase().includes(search) ||
          event.actor?.toLowerCase().includes(search);

        return matchesCategory && Boolean(matchesSearch);
      })
      .sort(
        (first, second) =>
          new Date(first.timestamp).getTime() -
          new Date(second.timestamp).getTime(),
      );
  }, [category, events, query]);

  const spacing = 18 * zoom;

  return (
    <VisualizationState state={state}>
      <section
        aria-label={accessibleLabel}
        style={{
          width,
          height,
          overflow: "auto",
          padding: 20,
          border: "1px solid #d9dde5",
          borderRadius: 12,
          background: "#ffffff",
          color: "#172033",
          boxSizing: "border-box",
        }}
      >
        <header style={{ marginBottom: 20 }}>
          <h2 style={{ margin: "0 0 14px", fontSize: 20 }}>{title}</h2>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search timeline"
              aria-label="Search memory timeline"
              style={{
                minWidth: 190,
                padding: "8px 10px",
                border: "1px solid #c5cad3",
                borderRadius: 8,
              }}
            />

            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              aria-label="Filter timeline by category"
              style={{
                padding: "8px 10px",
                border: "1px solid #c5cad3",
                borderRadius: 8,
              }}
            >
              <option value="all">All categories</option>

              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setZoom((value) => Math.max(0.7, value - 0.15))}
              aria-label="Zoom timeline out"
            >
              −
            </button>

            <span aria-live="polite">{Math.round(zoom * 100)}%</span>

            <button
              type="button"
              onClick={() => setZoom((value) => Math.min(1.8, value + 0.15))}
              aria-label="Zoom timeline in"
            >
              +
            </button>

            <button type="button" onClick={() => setZoom(1)}>
              Reset zoom
            </button>
          </div>
        </header>

        {filteredEvents.length === 0 ? (
          <p role="status">No timeline events match the selected filters.</p>
        ) : (
          <ol
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              borderLeft: "3px solid #5b67f1",
            }}
          >
            {filteredEvents.map((event) => (
              <li
                key={event.id}
                style={{
                  position: "relative",
                  marginLeft: 20,
                  marginBottom: spacing,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: -29,
                    top: 18,
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: "#5b67f1",
                    border: "3px solid #ffffff",
                  }}
                />

                <button
                  type="button"
                  onClick={() => onEventSelect?.(event)}
                  style={{
                    width: "100%",
                    padding: 16,
                    textAlign: "left",
                    border: "1px solid #d9dde5",
                    borderRadius: 10,
                    background: "#f8f9fc",
                    color: "inherit",
                    cursor: "pointer",
                  }}
                >
                  <time
                    dateTime={event.timestamp}
                    style={{ color: "#667085", fontSize: 13 }}
                  >
                    {new Date(event.timestamp).toLocaleString()}
                  </time>

                  <strong
                    style={{
                      display: "block",
                      marginTop: 6,
                      fontSize: 16,
                    }}
                  >
                    {event.title}
                  </strong>

                  {event.description && (
                    <span style={{ display: "block", marginTop: 6 }}>
                      {event.description}
                    </span>
                  )}

                  <span
                    style={{
                      display: "flex",
                      gap: 12,
                      flexWrap: "wrap",
                      marginTop: 10,
                      color: "#667085",
                      fontSize: 13,
                    }}
                  >
                    {event.actor && <span>Actor: {event.actor}</span>}
                    {event.category && <span>Category: {event.category}</span>}
                    {event.source && <span>Source: {event.source}</span>}
                    {event.confidence !== undefined && (
                      <span>
                        Confidence: {Math.round(event.confidence * 100)}%
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>
    </VisualizationState>
  );
}