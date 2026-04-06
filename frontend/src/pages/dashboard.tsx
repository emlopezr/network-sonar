import { startTransition, useDeferredValue, useEffect, useState } from "react";

import type { AppPath } from "../components/app-shell";
import { AppShell } from "../components/app-shell";
import { InspectorPanel } from "../components/inspector-panel";
import { Legend } from "../components/legend";
import { ProviderStrategyPanel } from "../components/provider-strategy-panel";
import { StatusCard } from "../components/status-card";
import { TimelineHeatmap } from "../components/timeline-heatmap";
import { fetchBootstrap, fetchHistory } from "../services/api-client";
import { connectStatusStream } from "../services/status-stream";
import { buildProviderRuntimeStats } from "../utils/provider-runtime";
import { getRangeSeconds } from "../utils/range";
import type {
  BootstrapResponse,
  CurrentStatusSnapshot,
  MonitorSample,
  MonitorSettings,
  RangePreset
} from "../types/monitor";
import { rangePresets } from "../types/monitor";

type StreamState = "connecting" | "live" | "reconnecting";
const defaultMonitorSettings: MonitorSettings = {
  roundRobinEnabled: false,
  providers: []
};

function normalizeMonitorSettings(settings: MonitorSettings | undefined): MonitorSettings {
  if (!settings) {
    return defaultMonitorSettings;
  }

  return {
    roundRobinEnabled: settings.roundRobinEnabled,
    providers: settings.providers ?? []
  };
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

function getOperationalRate(samples: MonitorSample[]): string {
  if (samples.length === 0) {
    return "--";
  }

  const okSamples = samples.filter((sample) => sample.status === "ok").length;
  return `${((okSamples / samples.length) * 100).toFixed(2)}%`;
}

function getStreamLabel(streamState: StreamState): string {
  switch (streamState) {
    case "connecting":
      return "Connecting";
    case "live":
      return "Live";
    case "reconnecting":
      return "Reconnecting";
  }
}

export function Dashboard({
  onNavigate = () => undefined
}: {
  onNavigate?: (path: AppPath) => void;
}) {
  const [range, setRange] = useState<RangePreset>("1h");
  const [current, setCurrent] = useState<CurrentStatusSnapshot | null>(null);
  const [history, setHistory] = useState<MonitorSample[]>([]);
  const [selectedSample, setSelectedSample] = useState<MonitorSample | null>(null);
  const [retentionDays, setRetentionDays] = useState(30);
  const [sampleIntervalSeconds, setSampleIntervalSeconds] = useState(5);
  const [streamState, setStreamState] = useState<StreamState>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);
  const [liveMode, setLiveMode] = useState(true);
  const [monitorSettings, setMonitorSettings] = useState<MonitorSettings>(defaultMonitorSettings);
  const [isProviderPanelOpen, setIsProviderPanelOpen] = useState(false);

  const deferredHistory = useDeferredValue(history);
  const rangeWindow = getRangeSeconds(range);
  const providerStats = buildProviderRuntimeStats(
    monitorSettings.providers,
    history,
    current?.externalTarget ?? null
  );

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
          setMonitorSettings(normalizeMonitorSettings(payload.monitorSettings));
        });
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load the initial status.");
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
      onSettings: (payload) => {
        setMonitorSettings(normalizeMonitorSettings(payload.monitorSettings));
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
  const selectedSampleIndex = selectedSample
    ? history.findIndex((sample) => sample.observedAt === selectedSample.observedAt)
    : -1;

  const refreshHistory = async (): Promise<void> => {
    const to = Math.floor(Date.now() / 1000);
    const payload = await fetchHistory(from, to);
    setHistory(payload.samples);
    setSelectedSample(payload.samples[payload.samples.length - 1] ?? null);
  };

  return (
    <AppShell
      activePage="dashboard"
      onNavigate={onNavigate}
      topbarContent={
        <div className={`dashboard-topbar__stream dashboard-topbar__stream--${streamState}`}>
          <span className="dashboard-topbar__pulse" aria-hidden="true" />
          <span className="mono">SSE: {getStreamLabel(streamState)}</span>
        </div>
      }
    >
      <main className="dashboard-content">
        {error ? (
          <section className="error-banner">
            <span className="error-banner__label">Alert</span>
            <p>{error}</p>
          </section>
        ) : null}

        <StatusCard
          snapshot={current}
          streamState={streamState}
          lastEventAt={lastEventAt}
          operationalRate={getOperationalRate(history)}
        />

        <section className="control-bar">
          <div className="control-bar__ranges" role="tablist" aria-label="Time range">
            {rangePresets.map((preset) => (
              <button
                key={preset}
                type="button"
                role="tab"
                aria-selected={range === preset}
                className={`control-bar__range${range === preset ? " is-active" : ""}`}
                onClick={() => setRange(preset)}
              >
                {preset}
              </button>
            ))}
          </div>
          <div className="control-bar__actions">
            <div className="live-switch">
              <span className="live-switch__label mono">Live Stream</span>
              <button
                type="button"
                className={`live-switch__toggle${liveMode ? " is-active" : ""}`}
                aria-pressed={liveMode}
                onClick={() => setLiveMode((previous) => !previous)}
              >
                <span className="live-switch__thumb" />
              </button>
              <span className={`live-switch__value mono${liveMode ? " is-active" : ""}`}>
                {liveMode ? "ON" : "OFF"}
              </span>
            </div>
            <span className="control-bar__divider" aria-hidden="true" />
            <button
              type="button"
              className="control-bar__refresh mono"
              onClick={() => void refreshHistory()}
            >
              Refresh range
            </button>
          </div>
        </section>

        <TimelineHeatmap
          samples={deferredHistory}
          selectedSample={selectedSample}
          onSelectSample={setSelectedSample}
          range={range}
          liveMode={liveMode}
          onLiveModeChange={setLiveMode}
        />

        <InspectorPanel sample={selectedSample} sampleIndex={selectedSampleIndex} />

        <ProviderStrategyPanel
          isOpen={isProviderPanelOpen}
          monitorSettings={monitorSettings}
          providerStats={providerStats}
          onToggleOpen={() => setIsProviderPanelOpen((previous) => !previous)}
          onNavigate={onNavigate}
        />

        <footer className="dashboard-footer">
          <Legend compact />
          <div className="dashboard-footer__meta mono">
            Instance ID: SONAR-NODE-01 // Retention: {retentionDays}d // Cadence: {sampleIntervalSeconds}s
          </div>
        </footer>
      </main>
    </AppShell>
  );
}
