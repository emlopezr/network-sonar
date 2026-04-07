import type { CurrentStatusSnapshot, MonitorRuntime } from "../types/monitor";

type StreamState = "connecting" | "live" | "reconnecting";

function formatRelativeTime(unixSeconds: number): string {
  if (unixSeconds <= 0) {
    return "No data";
  }

  const deltaSeconds = Math.max(0, Math.floor(Date.now() / 1000) - unixSeconds);

  if (deltaSeconds < 10) {
    return "Now";
  }

  if (deltaSeconds < 60) {
    return `${deltaSeconds}s ago`;
  }

  if (deltaSeconds < 3600) {
    return `${Math.floor(deltaSeconds / 60)}m ago`;
  }

  if (deltaSeconds < 86_400) {
    return `${Math.floor(deltaSeconds / 3600)}h ago`;
  }

  return `${Math.floor(deltaSeconds / 86_400)}d ago`;
}

function getStreamLabel(streamState: StreamState): string {
  switch (streamState) {
    case "live":
      return "Live";
    case "connecting":
      return "Connecting";
    case "reconnecting":
      return "Reconnecting";
  }
}

function getHeadline(status: CurrentStatusSnapshot["status"]): string {
  switch (status) {
    case "ok":
      return "OK";
    case "down":
      return "DOWN";
    case "stale":
      return "NO DATA";
  }
}

export function StatusCard({
  snapshot,
  monitorRuntime,
  streamState,
  lastEventAt,
  operationalRate
}: {
  snapshot: CurrentStatusSnapshot | null;
  monitorRuntime: MonitorRuntime;
  streamState: StreamState;
  lastEventAt: number | null;
  operationalRate: string;
}) {
  if (!snapshot) {
    return (
      <section className="status-hero status-hero--pending">
        <div className="status-hero__primary">
        <span className="status-hero__label">Current state</span>
        <h1>NO DATA</h1>
        <p className="status-hero__mode mono">Monitor: {monitorRuntime.mode.toUpperCase()}</p>
        <p className="status-hero__meta mono">System stability: --</p>
        </div>
        <dl className="status-hero__secondary">
          <div className="status-hero__metric">
            <dt>Target</dt>
            <dd className="mono">Not configured</dd>
          </div>
          <div className="status-hero__metric">
            <dt>Latency</dt>
            <dd className="mono">No data</dd>
          </div>
          <div className="status-hero__metric">
            <dt>Last Change</dt>
            <dd className="mono">No data</dd>
          </div>
          <div className="status-hero__metric">
            <dt>Heartbeat</dt>
            <dd className="mono">No data</dd>
          </div>
        </dl>
      </section>
    );
  }

  return (
    <section className={`status-hero status-hero--${snapshot.status}`}>
      <div className="status-hero__primary">
        <span className="status-hero__label">Current state</span>
        <h1>{getHeadline(snapshot.status)}</h1>
        <p className="status-hero__mode mono">Monitor: {monitorRuntime.mode.toUpperCase()}</p>
        <p className="status-hero__meta mono">System stability: {operationalRate}</p>
      </div>
      <dl className="status-hero__secondary">
        <div className="status-hero__metric">
          <dt className="status-hero__metric-label">Target</dt>
          <dd className="mono">{snapshot.externalTarget || "Not configured"}</dd>
        </div>
        <div className="status-hero__metric">
          <dt className="status-hero__metric-label">Latency</dt>
          <dd className="mono">
            {snapshot.externalLatencyMs === null ? "No data" : `${snapshot.externalLatencyMs} ms`}
          </dd>
        </div>
        <div className="status-hero__metric">
          <dt className="status-hero__metric-label">Last Change</dt>
          <dd className="mono">{formatRelativeTime(snapshot.lastChangeAt)}</dd>
        </div>
        <div className="status-hero__metric">
          <dt className="status-hero__metric-label">Heartbeat</dt>
          <dd className={`mono status-hero__heartbeat status-hero__heartbeat--${streamState}`}>
            {lastEventAt ? formatRelativeTime(lastEventAt) : getStreamLabel(streamState)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
