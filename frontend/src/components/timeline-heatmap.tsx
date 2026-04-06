import { useEffect, useRef, useState } from "react";

import type { MonitorSample, RangePreset } from "../types/monitor";
import { getRangeCopy } from "../utils/range";

function getSampleTone(status: MonitorSample["status"]): string {
  switch (status) {
    case "ok":
      return "ok";
    case "down":
      return "down";
  }
}

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
  sample: MonitorSample;
  left: number;
}

function formatDateTime(unixSeconds: number): string {
  return dateTimeFormatter.format(new Date(unixSeconds * 1000));
}

function formatTick(unixSeconds: number): string {
  return tickFormatter.format(new Date(unixSeconds * 1000));
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
  samples,
  selectedSample,
  onSelectSample,
  range,
  liveMode,
  onLiveModeChange
}: {
  samples: MonitorSample[];
  selectedSample: MonitorSample | null;
  onSelectSample: (sample: MonitorSample) => void;
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
  }, [samples, liveMode]);

  useEffect(() => {
    setTooltip(null);
  }, [samples.length, liveMode]);

  function showTooltip(sample: MonitorSample, target: HTMLButtonElement): void {
    const strip = stripRef.current;
    const viewport = stripViewportRef.current;

    if (!strip || !viewport) {
      return;
    }

    const rawLeft = target.offsetLeft - strip.scrollLeft + target.offsetWidth / 2;
    const horizontalPadding = 112;
    const maximum = Math.max(horizontalPadding, viewport.clientWidth - horizontalPadding);

    setTooltip({
      sample,
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
      return;
    }
  }

  return (
    <section className="timeline-panel">
      <div className="timeline-panel__header">
        <h3 className="timeline-panel__title">Connectivity Heatmap ({getRangeCopy(range)})</h3>
        <span className="timeline-panel__count mono">
          Samples: {samples.length.toLocaleString("en-US")}
        </span>
      </div>
      {samples.length === 0 ? (
        <div className="timeline-empty">
          <p className="eyebrow">No telemetry</p>
          <h3>No samples in the selected range</h3>
          <p className="timeline__summary">
            Adjust the time window or refresh the range to load the available history again.
          </p>
        </div>
      ) : (
        <>
          <div className="timeline-axis">
            <span className="mono">{formatTick(samples[0]?.observedAt ?? 0)}</span>
            <span className="mono">{formatTick(samples[Math.floor(samples.length / 2)]?.observedAt ?? 0)}</span>
            <span className="mono">{formatTick(samples[samples.length - 1]?.observedAt ?? 0)}</span>
          </div>
          <div ref={stripViewportRef} className="timeline-strip-shell">
            <div
              ref={stripRef}
              className="timeline-strip"
              role="list"
              aria-label="Connectivity history"
              data-live-mode={liveMode ? "on" : "off"}
              onScroll={handleTimelineScroll}
            >
              {samples.map((sample) => (
                <button
                  key={sample.observedAt}
                  type="button"
                  role="listitem"
                  aria-pressed={selectedSample?.observedAt === sample.observedAt}
                  className={`timeline-strip__cell timeline-strip__cell--${getSampleTone(sample.status)}${selectedSample?.observedAt === sample.observedAt ? " is-selected" : ""}`}
                  onMouseEnter={(event) => {
                    onSelectSample(sample);
                    showTooltip(sample, event.currentTarget);
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  onFocus={(event) => {
                    onSelectSample(sample);
                    showTooltip(sample, event.currentTarget);
                  }}
                  onBlur={() => setTooltip(null)}
                  onClick={(event) => {
                    onSelectSample(sample);
                    showTooltip(sample, event.currentTarget);
                  }}
                >
                  <span className="sr-only">{`${formatDateTime(sample.observedAt)} ${sample.status}`}</span>
                </button>
              ))}
            </div>
            {tooltip ? (
              <div className="timeline-tooltip" style={{ left: `${tooltip.left}px` }} role="status">
                <p className="timeline-tooltip__status">
                  STATUS: {tooltip.sample.status === "ok" ? "OK" : "DOWN"}
                </p>
                <p className="timeline-tooltip__time mono">{formatDateTime(tooltip.sample.observedAt)}</p>
                <p className="timeline-tooltip__meta mono">
                  {tooltip.sample.externalLatencyMs === null
                    ? "Latency unavailable"
                    : `Latency ${tooltip.sample.externalLatencyMs} ms`}
                </p>
                <p className="timeline-tooltip__meta">
                  {tooltip.sample.failureReason ?? "PING Successful"}
                </p>
              </div>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
