import { useEffect, useRef, useState } from "react";

import type { MonitorSample } from "../types/monitor";

function getSampleTone(status: MonitorSample["status"]): string {
  switch (status) {
    case "ok":
      return "ok";
    case "down":
      return "down";
  }
}

function formatDateTime(unixSeconds: number): string {
  const formatter = new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "medium"
  });

  return formatter.format(new Date(unixSeconds * 1000));
}

function formatTick(unixSeconds: number): string {
  const formatter = new Intl.DateTimeFormat("es-CO", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  return formatter.format(new Date(unixSeconds * 1000));
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
  onSelectSample
}: {
  samples: MonitorSample[];
  selectedSample: MonitorSample | null;
  onSelectSample: (sample: MonitorSample) => void;
}) {
  const stripRef = useRef<HTMLDivElement | null>(null);
  const autoScrollRef = useRef(false);
  const [liveMode, setLiveMode] = useState(true);

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

  function updateLiveMode(nextValue: boolean): void {
    setLiveMode(nextValue);

    if (!nextValue) {
      return;
    }

    const strip = stripRef.current;

    if (!strip) {
      return;
    }

    autoScrollRef.current = true;
    scrollStripToEnd(strip, "smooth");

    window.setTimeout(() => {
      autoScrollRef.current = false;
    }, 250);
  }

  function handleTimelineScroll(): void {
    const strip = stripRef.current;

    if (!strip || autoScrollRef.current) {
      return;
    }

    const remaining = strip.scrollWidth - strip.clientWidth - strip.scrollLeft;

    if (remaining > 24 && liveMode) {
      setLiveMode(false);
      return;
    }
  }

  if (samples.length === 0) {
    return (
      <section className="panel">
        <p className="eyebrow">Historial</p>
        <h2>Sin muestras en el rango seleccionado</h2>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="timeline__header">
        <div>
          <p className="eyebrow">Historial</p>
          <h2>Linea de tiempo de muestras</h2>
        </div>
        <div className="timeline__toolbar">
          <p className="timeline__count">{samples.length} muestras</p>
          <button
            type="button"
            className={`timeline-live-toggle${liveMode ? " is-active" : ""}`}
            onClick={() => updateLiveMode(!liveMode)}
          >
            {liveMode ? "Live on" : "Live off"}
          </button>
        </div>
      </div>
      <div className="timeline-axis">
        <span>{formatTick(samples[0]?.observedAt ?? 0)}</span>
        <span>{formatTick(samples[Math.floor(samples.length / 2)]?.observedAt ?? 0)}</span>
        <span>{formatTick(samples[samples.length - 1]?.observedAt ?? 0)}</span>
      </div>
      <div
        ref={stripRef}
        className="timeline-strip"
        role="list"
        aria-label="Historial de conectividad"
        data-live-mode={liveMode ? "on" : "off"}
        onScroll={handleTimelineScroll}
      >
        {samples.map((sample) => (
          <button
            key={sample.observedAt}
            type="button"
            role="listitem"
            className={`timeline-strip__cell timeline-strip__cell--${getSampleTone(sample.status)}${selectedSample?.observedAt === sample.observedAt ? " is-selected" : ""}`}
            onMouseEnter={() => onSelectSample(sample)}
            onFocus={() => onSelectSample(sample)}
            onClick={() => onSelectSample(sample)}
            title={`${formatDateTime(sample.observedAt)} | ${sample.status} | ${sample.failureReason ?? "sin error"}`}
          >
            <span className="sr-only">{`${formatDateTime(sample.observedAt)} ${sample.status}`}</span>
          </button>
        ))}
      </div>
      {selectedSample ? (
        <div className="timeline-detail">
          <p className="eyebrow">Detalle</p>
          <dl className="timeline-detail__grid">
            <div>
              <dt>Hora</dt>
              <dd>{formatDateTime(selectedSample.observedAt)}</dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd>{selectedSample.status === "ok" ? "Operativa" : "Sin conexion"}</dd>
            </div>
            <div>
              <dt>Latencia</dt>
              <dd>{selectedSample.externalLatencyMs === null ? "Sin dato" : `${selectedSample.externalLatencyMs} ms`}</dd>
            </div>
            <div>
              <dt>Motivo</dt>
              <dd>{selectedSample.failureReason ?? "Sin error"}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </section>
  );
}
