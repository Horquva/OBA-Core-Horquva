import { memo, useMemo, useState } from "react";
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

const controlStyle = {
  width: "100%",
  minHeight: 40,
  padding: "8px 10px",
  border: "1px solid #c5cad3",
  borderRadius: 8,
  background: "#ffffff",
  color: "#172033",
  boxSizing: "border-box",
} as const;

function getTimestamp(event: TimelineEvent) {
  const timestamp = new Date(event.timestamp).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getDateInputValue(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function getConfidenceColor(confidence: number) {
  if (confidence >= 0.8) {
    return "#15803d";
  }

  if (confidence >= 0.5) {
    return "#b45309";
  }

  return "#b42318";
}

type PreparedTimelineEvent = {
  event: TimelineEvent;
  timestamp: number;
  formattedTimestamp: string;
};

type TimelineEventCardProps = {
  event: TimelineEvent;
  formattedTimestamp: string;
  spacing: number;
  onEventSelect: ((event: TimelineEvent) => void) | undefined;
};

const TimelineEventCard = memo(function TimelineEventCard({
  event,
  formattedTimestamp,
  spacing,
  onEventSelect,
}: TimelineEventCardProps) {
  const confidence =
    event.confidence === undefined
      ? undefined
      : Math.min(1, Math.max(0, event.confidence));

  const confidencePercentage =
    confidence === undefined
      ? undefined
      : Math.round(confidence * 100);

  return (
    <li
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
        aria-label={`${event.title}, ${formattedTimestamp}`}
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
          style={{
            color: "#667085",
            fontSize: 13,
          }}
        >
          {formattedTimestamp}
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
          <span
            style={{
              display: "block",
              marginTop: 6,
              lineHeight: 1.5,
            }}
          >
            {event.description}
          </span>
        )}

        <span
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginTop: 12,
            color: "#475467",
            fontSize: 13,
          }}
        >
          {event.actor && (
            <span
              style={{
                padding: "4px 8px",
                borderRadius: 999,
                background: "#eef2ff",
              }}
            >
              Actor: {event.actor}
            </span>
          )}

          {event.category && (
            <span
              style={{
                padding: "4px 8px",
                borderRadius: 999,
                background: "#f2f4f7",
              }}
            >
              Category: {event.category}
            </span>
          )}

          {event.source && (
            <span
              title="Event provenance or source"
              style={{
                padding: "4px 8px",
                borderRadius: 999,
                background: "#e0f2fe",
                color: "#075985",
              }}
            >
              Source: {event.source}
            </span>
          )}
        </span>

        {confidence !== undefined &&
          confidencePercentage !== undefined && (
            <span
              style={{
                display: "grid",
                gridTemplateColumns: "auto minmax(80px, 160px)",
                alignItems: "center",
                gap: 10,
                marginTop: 12,
                color: getConfidenceColor(confidence),
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <span>Confidence: {confidencePercentage}%</span>

              <span
                role="progressbar"
                aria-label={`${event.title} confidence`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={confidencePercentage}
                style={{
                  height: 8,
                  overflow: "hidden",
                  borderRadius: 999,
                  background: "#e4e7ec",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    display: "block",
                    width: `${confidencePercentage}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: getConfidenceColor(confidence),
                  }}
                />
              </span>
            </span>
          )}
      </button>
    </li>
  );
});

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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [scrubPosition, setScrubPosition] = useState(100);
  const [zoom, setZoom] = useState(1);

  const sortedEvents = useMemo<PreparedTimelineEvent[]>(
    () =>
      events
        .map((event) => {
          const timestamp = getTimestamp(event);

          return {
            event,
            timestamp,
            formattedTimestamp:
              timestamp > 0
                ? new Date(timestamp).toLocaleString()
                : "Invalid date",
          };
        })
        .sort((first, second) => first.timestamp - second.timestamp),
    [events],
  );

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          sortedEvents
            .map(({ event }) => event.category)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((first, second) => first.localeCompare(second)),
    [sortedEvents],
  );

  const timelineBounds = useMemo(() => {
    const validTimestamps = sortedEvents
      .map(({ timestamp }) => timestamp)
      .filter((timestamp) => timestamp > 0);

    if (validTimestamps.length === 0) {
      return undefined;
    }

    return {
      minimum: validTimestamps[0] as number,
      maximum: validTimestamps[validTimestamps.length - 1] as number,
    };
  }, [sortedEvents]);

  const minimumDate = timelineBounds
    ? getDateInputValue(timelineBounds.minimum)
    : undefined;

  const maximumDate = timelineBounds
    ? getDateInputValue(timelineBounds.maximum)
    : undefined;

  const selectedStartTimestamp = startDate
    ? new Date(`${startDate}T00:00:00.000`).getTime()
    : timelineBounds?.minimum;

  const selectedEndTimestamp = endDate
    ? new Date(`${endDate}T23:59:59.999`).getTime()
    : timelineBounds?.maximum;

  const activeStartTimestamp = selectedStartTimestamp ?? 0;
  const activeEndTimestamp =
    selectedEndTimestamp ?? activeStartTimestamp;

  const safeEndTimestamp = Math.max(
    activeStartTimestamp,
    activeEndTimestamp,
  );

  const scrubTimestamp =
    activeStartTimestamp +
    (safeEndTimestamp - activeStartTimestamp) *
      (scrubPosition / 100);

  const scrubDateLabel = timelineBounds
    ? new Date(scrubTimestamp).toLocaleString()
    : "No events";

  const filteredEvents = useMemo(() => {
    const search = query.toLowerCase().trim();

    return sortedEvents.filter(({ event, timestamp }) => {

      const matchesCategory =
        category === "all" || event.category === category;

      const matchesSearch =
        !search ||
        event.title.toLowerCase().includes(search) ||
        event.description?.toLowerCase().includes(search) ||
        event.actor?.toLowerCase().includes(search) ||
        event.category?.toLowerCase().includes(search) ||
        event.source?.toLowerCase().includes(search);

      const matchesStartDate =
        selectedStartTimestamp === undefined ||
        timestamp >= selectedStartTimestamp;

      const matchesEndDate =
        selectedEndTimestamp === undefined ||
        timestamp <= selectedEndTimestamp;

      const matchesScrubber =
        !timelineBounds || timestamp <= scrubTimestamp;

      return Boolean(
        matchesCategory &&
          matchesSearch &&
          matchesStartDate &&
          matchesEndDate &&
          matchesScrubber,
      );
    });
  }, [
    category,
    query,
    scrubTimestamp,
    selectedEndTimestamp,
    selectedStartTimestamp,
    sortedEvents,
    timelineBounds,
  ]);

  const spacing = 18 * zoom;

  const resetFilters = () => {
    setQuery("");
    setCategory("all");
    setStartDate("");
    setEndDate("");
    setScrubPosition(100);
  };

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
          <h2 style={{ margin: "0 0 14px", fontSize: 20 }}>
            {title}
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(180px, 100%), 1fr))",
              gap: 12,
              alignItems: "end",
            }}
          >
            <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
              <span>Search</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search timeline"
                aria-label="Search memory timeline"
                style={controlStyle}
              />
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
              <span>Category</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                aria-label="Filter timeline by category"
                style={controlStyle}
              >
                <option value="all">All categories</option>

                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
              <span>Start date</span>
              <input
                type="date"
                value={startDate}
                min={minimumDate}
                max={endDate || maximumDate}
                onChange={(event) => {
                  setStartDate(event.target.value);
                  setScrubPosition(100);
                }}
                aria-label="Filter timeline from date"
                style={controlStyle}
              />
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
              <span>End date</span>
              <input
                type="date"
                value={endDate}
                min={startDate || minimumDate}
                max={maximumDate}
                onChange={(event) => {
                  setEndDate(event.target.value);
                  setScrubPosition(100);
                }}
                aria-label="Filter timeline until date"
                style={controlStyle}
              />
            </label>
          </div>

          <div
            style={{
              display: "grid",
              gap: 8,
              marginTop: 16,
              padding: 14,
              border: "1px solid #e4e7ec",
              borderRadius: 10,
              background: "#f8f9fc",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                fontSize: 13,
              }}
            >
              <label htmlFor="memory-timeline-scrubber">
                Timeline position
              </label>

              <output
                htmlFor="memory-timeline-scrubber"
                aria-live="polite"
              >
                Showing through {scrubDateLabel}
              </output>
            </div>

            <input
              id="memory-timeline-scrubber"
              type="range"
              min="0"
              max="100"
              step="1"
              value={scrubPosition}
              disabled={!timelineBounds}
              onChange={(event) =>
                setScrubPosition(Number(event.target.value))
              }
              aria-label="Scrub through timeline events"
              aria-valuetext={`Showing events through ${scrubDateLabel}`}
              style={{
                width: "100%",
                cursor: timelineBounds ? "pointer" : "not-allowed",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
              marginTop: 14,
            }}
          >
            <button
              type="button"
              onClick={() =>
                setZoom((value) => Math.max(0.7, value - 0.15))
              }
              aria-label="Zoom timeline out"
              style={{ minWidth: 40, minHeight: 40 }}
            >
              −
            </button>

            <span aria-live="polite" aria-label="Timeline zoom level">
              {Math.round(zoom * 100)}%
            </span>

            <button
              type="button"
              onClick={() =>
                setZoom((value) => Math.min(1.8, value + 0.15))
              }
              aria-label="Zoom timeline in"
              style={{ minWidth: 40, minHeight: 40 }}
            >
              +
            </button>

            <button
              type="button"
              onClick={() => setZoom(1)}
              style={{ minHeight: 40 }}
            >
              Reset zoom
            </button>

            <button
              type="button"
              onClick={resetFilters}
              style={{ minHeight: 40 }}
            >
              Clear filters
            </button>

            <span
              role="status"
              aria-live="polite"
              style={{
                marginLeft: "auto",
                color: "#667085",
                fontSize: 13,
              }}
            >
              {filteredEvents.length} of {events.length} events
            </span>
          </div>
        </header>

        {filteredEvents.length === 0 ? (
          <p role="status">
            No timeline events match the selected filters.
          </p>
        ) : (
          <ol
            aria-label="Chronological memory events"
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              borderLeft: "3px solid #5b67f1",
            }}
          >
            {filteredEvents.map(({ event, formattedTimestamp }) => (
              <TimelineEventCard
                key={event.id}
                event={event}
                formattedTimestamp={formattedTimestamp}
                spacing={spacing}
                onEventSelect={onEventSelect}
              />
            ))}
          </ol>
        )}
      </section>
    </VisualizationState>
  );
}
