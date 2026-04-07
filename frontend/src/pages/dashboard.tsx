import { startTransition, useDeferredValue, useEffect, useState } from "react";

import type { AppPath } from "../components/app-shell";
import { AppShell } from "../components/app-shell";
import { InspectorPanel } from "../components/inspector-panel";
import { Legend } from "../components/legend";
import { ProviderStrategyPanel } from "../components/provider-strategy-panel";
import { StatusCard } from "../components/status-card";
import { TimelineHeatmap } from "../components/timeline-heatmap";
import {
  fetchBootstrap,
  fetchHistory,
  fetchHistorySegments,
  updateMonitorRuntime,
  updateMonitorSettings
} from "../services/api-client";
import { connectStatusStream } from "../services/status-stream";
import { shouldMarkSnapshotStale } from "../utils/current-snapshot";
import { buildProviderRuntimeStats } from "../utils/provider-runtime";
import { getRangeSeconds } from "../utils/range";
import type {
  BootstrapResponse,
  CurrentStatusSnapshot,
  MonitorRuntime,
  MonitorSample,
  MonitorSettings,
  RangePreset,
  TimelineSegment
} from "../types/monitor";
import { rangePresets } from "../types/monitor";

type StreamState = "connecting" | "live" | "reconnecting";
const defaultMonitorSettings: MonitorSettings = {
  roundRobinEnabled: false,
  confirmDownAfter: 2,
  confirmUpAfter: 2,
  providers: []
};
const defaultMonitorRuntime: MonitorRuntime = {
  mode: "running"
};

function normalizeMonitorSettings(settings: MonitorSettings | undefined): MonitorSettings {
  if (!settings) {
    return defaultMonitorSettings;
  }

  return {
    roundRobinEnabled: settings.roundRobinEnabled,
    confirmDownAfter: settings.confirmDownAfter,
    confirmUpAfter: settings.confirmUpAfter,
    providers: settings.providers ?? []
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

function trimTimelineSegments(
  segments: TimelineSegment[],
  minObservedAt: number
): TimelineSegment[] {
  return segments
    .map((segment) => ({
      ...segment,
      visibleStart: Math.max(segment.visibleStart, minObservedAt),
      durationSeconds: Math.max(0, segment.visibleEnd - Math.max(segment.visibleStart, minObservedAt)),
      startedBeforeRange: segment.startedAt < minObservedAt
    }))
    .filter((segment) => segment.visibleEnd >= minObservedAt)
    .sort((left, right) => left.visibleStart - right.visibleStart);
}

function mergeLiveSegment(
  segments: TimelineSegment[],
  snapshot: CurrentStatusSnapshot,
  minObservedAt: number
): TimelineSegment[] {
  if (snapshot.status === "stale") {
    return segments;
  }

  const nextSegments = trimTimelineSegments(segments, minObservedAt);
  const latestSegment = nextSegments[nextSegments.length - 1] ?? null;
  const segmentStart = snapshot.lastChangeAt;

  if (
    latestSegment &&
    latestSegment.status === snapshot.status &&
    latestSegment.startedAt === segmentStart
  ) {
    const updatedSegment: TimelineSegment = {
      ...latestSegment,
      visibleStart: Math.max(latestSegment.startedAt, minObservedAt),
      visibleEnd: snapshot.observedAt,
      durationSeconds: Math.max(0, snapshot.observedAt - Math.max(latestSegment.startedAt, minObservedAt)),
      endedAt: null,
      lastObservedAt: snapshot.observedAt,
      latestFailureReason: snapshot.failureReason,
      latestLatencyMs: snapshot.externalLatencyMs,
      endsAfterRange: true
    };

    return [...nextSegments.slice(0, -1), updatedSegment];
  }

  const closedSegments = latestSegment
    ? [
        ...nextSegments.slice(0, -1),
        {
          ...latestSegment,
          endedAt: segmentStart,
          visibleEnd: Math.max(latestSegment.visibleStart, segmentStart),
          durationSeconds: Math.max(0, Math.max(latestSegment.visibleStart, segmentStart) - latestSegment.visibleStart),
          endsAfterRange: false
        }
      ].filter((segment) => segment.visibleEnd > segment.visibleStart)
    : nextSegments;

  return [
    ...closedSegments,
    {
      status: snapshot.status,
      startedAt: segmentStart,
      endedAt: null,
      visibleStart: Math.max(segmentStart, minObservedAt),
      visibleEnd: snapshot.observedAt,
      durationSeconds: Math.max(0, snapshot.observedAt - Math.max(segmentStart, minObservedAt)),
      sampleCount: 0,
      lastObservedAt: snapshot.observedAt,
      latestFailureReason: snapshot.failureReason,
      latestLatencyMs: snapshot.externalLatencyMs,
      startedBeforeRange: segmentStart < minObservedAt,
      endsAfterRange: true
    }
  ];
}

function getSegmentSelection(
  segments: TimelineSegment[],
  previous: TimelineSegment | null
): TimelineSegment | null {
  if (!previous) {
    return segments[segments.length - 1] ?? null;
  }

  return (
    segments.find(
      (segment) =>
        segment.startedAt === previous.startedAt &&
        segment.status === previous.status
    ) ??
    segments[segments.length - 1] ??
    null
  );
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
  const [historySegments, setHistorySegments] = useState<TimelineSegment[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<TimelineSegment | null>(null);
  const [retentionDays, setRetentionDays] = useState(30);
  const [sampleIntervalSeconds, setSampleIntervalSeconds] = useState(5);
  const [streamState, setStreamState] = useState<StreamState>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);
  const [liveMode, setLiveMode] = useState(true);
  const [monitorSettings, setMonitorSettings] = useState<MonitorSettings>(defaultMonitorSettings);
  const [monitorRuntime, setMonitorRuntime] = useState<MonitorRuntime>(defaultMonitorRuntime);
  const [isProviderPanelOpen, setIsProviderPanelOpen] = useState(false);
  const [savingRoundRobin, setSavingRoundRobin] = useState(false);
  const [savingRuntime, setSavingRuntime] = useState(false);

  const deferredSegments = useDeferredValue(historySegments);
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
          setHistorySegments(payload.historySegments);
          setSelectedSegment(payload.historySegments[payload.historySegments.length - 1] ?? null);
          setRetentionDays(payload.retentionDays);
          setSampleIntervalSeconds(payload.sampleIntervalSeconds);
          setMonitorSettings(normalizeMonitorSettings(payload.monitorSettings));
          setMonitorRuntime(payload.monitorRuntime);
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
        setHistorySegments((previous) => {
          const nextSegments = mergeLiveSegment(
            previous,
            payload.current,
            payload.current.observedAt - rangeWindow
          );

          setSelectedSegment((currentSelection) =>
            getSegmentSelection(nextSegments, currentSelection)
          );

          return nextSegments;
        });
        setLastEventAt(Math.floor(Date.now() / 1000));
      },
      onSettings: (payload) => {
        setMonitorSettings(normalizeMonitorSettings(payload.monitorSettings));
        setSavingRoundRobin(false);
      },
      onRuntime: (payload) => {
        setMonitorRuntime(payload.monitorRuntime);
        setSavingRuntime(false);
      },
      onSample: (payload) => {
        setHistory((previous) =>
          mergeHistorySample(previous, payload, payload.observedAt - rangeWindow)
        );
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
        if (!shouldMarkSnapshotStale(previous, lastEventAt, now, monitorRuntime.mode !== "paused")) {
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
  }, [lastEventAt, monitorRuntime.mode]);

  const from = Math.floor(Date.now() / 1000) - rangeWindow;

  const refreshHistory = async (): Promise<void> => {
    const to = Math.floor(Date.now() / 1000);
    const [historyPayload, segmentsPayload] = await Promise.all([
      fetchHistory(from, to),
      fetchHistorySegments(from, to)
    ]);

    setHistory(historyPayload.samples);
    setHistorySegments(segmentsPayload.segments);
    setSelectedSegment((previous) => getSegmentSelection(segmentsPayload.segments, previous));
  };

  async function handleRoundRobinToggle(): Promise<void> {
    try {
      setSavingRoundRobin(true);
      setError(null);
      const updatedSettings = normalizeMonitorSettings(await updateMonitorSettings({
        roundRobinEnabled: !monitorSettings.roundRobinEnabled
      }));
      setMonitorSettings(updatedSettings);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update the monitor settings."
      );
    } finally {
      setSavingRoundRobin(false);
    }
  }

  async function handleRuntimeToggle(): Promise<void> {
    try {
      setSavingRuntime(true);
      setError(null);
      const updatedRuntime = await updateMonitorRuntime({
        mode: monitorRuntime.mode === "running" ? "paused" : "running"
      });
      setMonitorRuntime(updatedRuntime);
      await refreshHistory();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update the monitor runtime."
      );
    } finally {
      setSavingRuntime(false);
    }
  }

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
          monitorRuntime={monitorRuntime}
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
              Refresh
            </button>
            <button
              type="button"
              className={`control-bar__runtime mono${monitorRuntime.mode === "paused" ? " is-paused" : ""}`}
              onClick={() => void handleRuntimeToggle()}
              disabled={savingRuntime}
            >
              {savingRuntime
                ? "Saving..."
                : monitorRuntime.mode === "running"
                  ? "Pause Monitor"
                  : "Resume Monitor"}
            </button>
          </div>
        </section>

        <TimelineHeatmap
          segments={deferredSegments}
          selectedSegment={selectedSegment}
          onSelectSegment={(segment) => {
            setSelectedSegment(segment);
          }}
          range={range}
          liveMode={liveMode}
          onLiveModeChange={setLiveMode}
        />

        <InspectorPanel segment={selectedSegment} />

        <ProviderStrategyPanel
          isOpen={isProviderPanelOpen}
          monitorSettings={monitorSettings}
          providerStats={providerStats}
          onToggleOpen={() => setIsProviderPanelOpen((previous) => !previous)}
          onNavigate={onNavigate}
          onToggleRoundRobin={() => void handleRoundRobinToggle()}
          savingRoundRobin={savingRoundRobin}
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
