import { startTransition, useDeferredValue, useEffect, useState } from "react";

import { Legend } from "../components/legend";
import { StatusCard } from "../components/status-card";
import { TimelineHeatmap } from "../components/timeline-heatmap";
import { fetchBootstrap, fetchHistory } from "../services/api-client";
import { connectStatusStream } from "../services/status-stream";
import type {
  BootstrapResponse,
  CurrentStatusSnapshot,
  MonitorSample,
  RangePreset
} from "../types/monitor";
import { rangePresets } from "../types/monitor";

type StreamState = "connecting" | "live" | "reconnecting";

function getRangeSeconds(range: RangePreset): number {
  switch (range) {
    case "1h":
      return 60 * 60;
    case "6h":
      return 6 * 60 * 60;
    case "24h":
      return 24 * 60 * 60;
    case "7d":
      return 7 * 24 * 60 * 60;
    case "30d":
      return 30 * 24 * 60 * 60;
  }
}

function normalizeCurrentSnapshot(previous: CurrentStatusSnapshot | null, sample: MonitorSample): CurrentStatusSnapshot {
  const staleAfterSeconds = previous?.staleAfterSeconds ?? 15;
  const lastChangeAt =
    !previous || previous.status !== sample.status ? sample.observedAt : previous.lastChangeAt;

  return {
    observedAt: sample.observedAt,
    status: sample.status,
    externalTarget: sample.externalTarget,
    externalOk: sample.externalOk,
    externalLatencyMs: sample.externalLatencyMs,
    failureReason: sample.failureReason,
    staleAfterSeconds,
    lastChangeAt
  };
}

function mergeHistorySample(
  history: MonitorSample[],
  incoming: MonitorSample,
  minObservedAt: number
): MonitorSample[] {
  const deduped = history.filter((sample) => sample.observedAt !== incoming.observedAt);
  return [...deduped, incoming]
    .filter((sample) => sample.observedAt >= minObservedAt)
    .sort((left, right) => left.observedAt - right.observedAt);
}

export function Dashboard() {
  const [range, setRange] = useState<RangePreset>("1h");
  const [current, setCurrent] = useState<CurrentStatusSnapshot | null>(null);
  const [history, setHistory] = useState<MonitorSample[]>([]);
  const [selectedSample, setSelectedSample] = useState<MonitorSample | null>(null);
  const [retentionDays, setRetentionDays] = useState(30);
  const [sampleIntervalSeconds, setSampleIntervalSeconds] = useState(5);
  const [streamState, setStreamState] = useState<StreamState>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);

  const deferredHistory = useDeferredValue(history);
  const rangeWindow = getRangeSeconds(range);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setError(null);

      try {
        const payload: BootstrapResponse = await fetchBootstrap(range);

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setCurrent(payload.current);
          setHistory(payload.history);
          setSelectedSample(payload.history[payload.history.length - 1] ?? null);
          setRetentionDays(payload.retentionDays);
          setSampleIntervalSeconds(payload.sampleIntervalSeconds);
        });
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el estado inicial.");
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [range]);

  useEffect(() => {
    const disconnect = connectStatusStream({
      onOpen: () => setStreamState("live"),
      onSnapshot: (payload) => {
        setCurrent(payload.current);
        setLastEventAt(Math.floor(Date.now() / 1000));
      },
      onSample: (payload) => {
        setCurrent((previous) => normalizeCurrentSnapshot(previous, payload));
        setHistory((previous) =>
          mergeHistorySample(previous, payload, payload.observedAt - rangeWindow)
        );
        setSelectedSample(payload);
        setLastEventAt(Math.floor(Date.now() / 1000));
      },
      onHeartbeat: (payload) => {
        setLastEventAt(payload.now);
      },
      onError: () => {
        setStreamState("reconnecting");
      }
    });

    return disconnect;
  }, [rangeWindow]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrent((previous) => {
        if (!previous) {
          return previous;
        }

        const now = Math.floor(Date.now() / 1000);
        if (now - previous.observedAt <= previous.staleAfterSeconds || previous.status === "stale") {
          return previous;
        }

        return {
          ...previous,
          status: "stale"
        };
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const from = Math.floor(Date.now() / 1000) - rangeWindow;

  const refreshHistory = async (): Promise<void> => {
    const to = Math.floor(Date.now() / 1000);
    const payload = await fetchHistory(from, to);
    setHistory(payload.samples);
    setSelectedSample(payload.samples[payload.samples.length - 1] ?? null);
  };

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Network Sonar</p>
          <h1>Monitor local de conectividad</h1>
          <p className="dashboard-header__copy">
            Supervisa cambios en vivo y conserva contexto historico para distinguir incidentes del proveedor frente a fallas internas.
          </p>
        </div>
        <div className="dashboard-controls">
          <label>
            Rango
            <select value={range} onChange={(event) => setRange(event.target.value as RangePreset)}>
              {rangePresets.map((preset) => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => void refreshHistory()}>
            Recargar rango
          </button>
        </div>
      </header>

      {error ? <div className="panel panel--error">{error}</div> : null}

      <div className="dashboard-grid">
        <StatusCard snapshot={current} streamState={streamState} lastEventAt={lastEventAt} />

        <section className="panel">
          <p className="eyebrow">Retencion</p>
          <h2>{retentionDays} dias de historial</h2>
          <p className="stacked-copy">
            Cada bloque representa una muestra real cada {sampleIntervalSeconds} segundos. El rango actual cubre los ultimos {range}.
          </p>
          <Legend />
        </section>
      </div>

      <TimelineHeatmap
        samples={deferredHistory}
        selectedSample={selectedSample}
        onSelectSample={setSelectedSample}
      />
    </div>
  );
}
