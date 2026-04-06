import { useEffect, useRef, useState } from "react";

import type { RangePreset, TimelineSegment } from "../types/monitor";
import { getRangeCopy } from "../utils/range";

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "medium"
});

const tickFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

interface TimelineTooltipState {
  segment: TimelineSegment;
  left: number;
}

function getSegmentTone(status: TimelineSegment["status"]): string {
  switch (status) {
    case "ok":
      return "ok";
    case "down":
      return "down";
    case "no_data":
      return "no-data";
  }
}

function formatDateTime(unixSeconds: number): string {
  return dateTimeFormatter.format(new Date(unixSeconds * 1000));
}

function formatTick(unixSeconds: number): string {
  return tickFormatter.format(new Date(unixSeconds * 1000));
}

function formatDuration(durationSeconds: number): string {
  if (durationSeconds < 60) {
    return `${durationSeconds}s`;
  }

  if (durationSeconds < 3600) {
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;

    return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
  }

  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);

  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

function scrollStripToEnd(strip: HTMLDivElement, behavior: ScrollBehavior): void {
  if (typeof strip.scrollTo === "function") {
    strip.scrollTo({
      left: strip.scrollWidth,
      behavior
    });
    return;
  }

  strip.scrollLeft = strip.scrollWidth;
}

export function TimelineHeatmap({
  segments,
  selectedSegment,
  onSelectSegment,
  range,
  liveMode,
  onLiveModeChange
}: {
  segments: TimelineSegment[];
  selectedSegment: TimelineSegment | null;
  onSelectSegment: (segment: TimelineSegment) => void;
  range: RangePreset;
  liveMode: boolean;
  onLiveModeChange: (nextValue: boolean) => void;
}) {
  const stripRef = useRef<HTMLDivElement | null>(null);
  const stripViewportRef = useRef<HTMLDivElement | null>(null);
  const autoScrollRef = useRef(false);
  const [tooltip, setTooltip] = useState<TimelineTooltipState | null>(null);

  useEffect(() => {
    const strip = stripRef.current;

    if (!strip || !liveMode) {
      return;
    }

    autoScrollRef.current = true;
    scrollStripToEnd(strip, "auto");

    const frame = window.requestAnimationFrame(() => {
      autoScrollRef.current = false;
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [segments, liveMode]);

  useEffect(() => {
    setTooltip(null);
  }, [segments.length, liveMode]);

  function showTooltip(segment: TimelineSegment, target: HTMLButtonElement): void {
    const strip = stripRef.current;
    const viewport = stripViewportRef.current;

    if (!strip || !viewport) {
      return;
    }

    const rawLeft = target.offsetLeft - strip.scrollLeft + target.offsetWidth / 2;
    const horizontalPadding = 112;
    const maximum = Math.max(horizontalPadding, viewport.clientWidth - horizontalPadding);

    setTooltip({
      segment,
      left: Math.min(Math.max(rawLeft, horizontalPadding), maximum)
    });
  }

  function handleTimelineScroll(): void {
    const strip = stripRef.current;

    if (!strip || autoScrollRef.current) {
      return;
    }

    setTooltip(null);

    const remaining = strip.scrollWidth - strip.clientWidth - strip.scrollLeft;

    if (remaining > 24 && liveMode) {
      onLiveModeChange(false);
    }
  }

  const rangeStart = segments[0]?.visibleStart ?? 0;
  const rangeEnd = segments[segments.length - 1]?.visibleEnd ?? 0;
  const midpoint = rangeStart + Math.floor((rangeEnd - rangeStart) / 2);
  const totalDuration = Math.max(
    1,
    segments.reduce(
      (accumulator, segment) => accumulator + Math.max(1, segment.visibleEnd - segment.visibleStart),
      0
    )
  );

  return (
    <section className="timeline-panel">
      <div className="timeline-panel__header">
        <h3 className="timeline-panel__title">Connectivity Timeline ({getRangeCopy(range)})</h3>
        <span className="timeline-panel__count mono">
          Segments: {segments.length.toLocaleString("en-US")}
        </span>
      </div>
      {segments.length === 0 ? (
        <div className="timeline-empty">
          <p className="eyebrow">No telemetry</p>
          <h3>No segments in the selected range</h3>
          <p className="timeline__summary">
            Adjust the time window or refresh the range to load the available history again.
          </p>
        </div>
      ) : (
        <>
          <div className="timeline-axis">
            <span className="mono">{formatTick(rangeStart)}</span>
            <span className="mono">{formatTick(midpoint)}</span>
            <span className="mono">{formatTick(rangeEnd)}</span>
          </div>
          <div ref={stripViewportRef} className="timeline-strip-shell">
            <div
              ref={stripRef}
              className="timeline-strip timeline-strip--segments"
              role="list"
              aria-label="Connectivity timeline"
              data-live-mode={liveMode ? "on" : "off"}
              onScroll={handleTimelineScroll}
            >
              {segments.map((segment) => {
                const flexWeight = Math.max(1, segment.visibleEnd - segment.visibleStart);
                const durationRatio = (flexWeight / totalDuration) * 100;

                return (
                  <button
                    key={`${segment.status}-${segment.startedAt}`}
                    type="button"
                    role="listitem"
                    aria-pressed={
                      selectedSegment?.startedAt === segment.startedAt &&
                      selectedSegment.status === segment.status
                    }
                    className={`timeline-segment timeline-segment--${getSegmentTone(segment.status)}${selectedSegment?.startedAt === segment.startedAt && selectedSegment.status === segment.status ? " is-selected" : ""}`}
                    style={{
                      flexGrow: flexWeight,
                      flexBasis: 0,
                      minWidth: durationRatio < 4 ? "22px" : "36px"
                    }}
                    onMouseEnter={(event) => {
                      onSelectSegment(segment);
                      showTooltip(segment, event.currentTarget);
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    onFocus={(event) => {
                      onSelectSegment(segment);
                      showTooltip(segment, event.currentTarget);
                    }}
                    onBlur={() => setTooltip(null)}
                    onClick={(event) => {
                      onSelectSegment(segment);
                      showTooltip(segment, event.currentTarget);
                    }}
                  >
                    <span className="timeline-segment__label sr-only">
                      {`${formatDateTime(segment.visibleStart)} ${segment.status}`}
                    </span>
                  </button>
                );
              })}
            </div>
            {tooltip ? (
              <div className="timeline-tooltip" style={{ left: `${tooltip.left}px` }} role="status">
                <p
                  className={`timeline-tooltip__status timeline-tooltip__status--${getSegmentTone(tooltip.segment.status)}`}
                >
                  STATUS: {tooltip.segment.status === "ok" ? "OK" : tooltip.segment.status === "down" ? "DOWN" : "NO DATA"}
                </p>
                <p className="timeline-tooltip__time mono">
                  {formatDateTime(tooltip.segment.visibleStart)} to {formatDateTime(tooltip.segment.visibleEnd)}
                </p>
                <p className="timeline-tooltip__meta mono">
                  Duration {formatDuration(Math.max(1, tooltip.segment.durationSeconds))}
                </p>
                <p className="timeline-tooltip__meta">
                  {tooltip.segment.sampleCount} raw samples in segment
                </p>
              </div>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
