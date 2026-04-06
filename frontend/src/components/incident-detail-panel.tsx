import type { OutageIncident } from "../types/monitor";

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "medium"
});

function formatDateTime(unixSeconds: number | null): string {
  if (unixSeconds === null) {
    return "Ongoing";
  }

  return dateTimeFormatter.format(new Date(unixSeconds * 1000));
}

function formatDuration(durationSeconds: number): string {
  if (durationSeconds < 60) {
    return `${durationSeconds}s`;
  }

  if (durationSeconds < 3600) {
    return `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`;
  }

  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);

  return `${hours}h ${minutes}m`;
}

function getStatusLabel(status: OutageIncident["status"]): string {
  return status === "ongoing" ? "Ongoing" : "Resolved";
}

function formatIncidentReason(reason: string | null, fallback: string): string {
  if (!reason) {
    return fallback;
  }

  return `${reason.charAt(0).toUpperCase()}${reason.slice(1)}`;
}

export function IncidentDetailPanel({ incident }: { incident: OutageIncident | null }) {
  if (!incident) {
    return (
      <section className="incident-detail" aria-live="polite">
        <div className="incident-detail__header">
          <p className="eyebrow">Details</p>
          <h2>Select an outage</h2>
          <p className="incident-detail__copy">
            The panel will show the start, duration, recovery time, and failed samples for the selected incident.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="incident-detail" aria-live="polite">
      <div className="incident-detail__header">
        <p className="eyebrow">Details</p>
        <div className="incident-detail__headline">
          <h2>{getStatusLabel(incident.status)}</h2>
          <span className={`incident-detail__status incident-detail__status--${incident.status}`}>
            {getStatusLabel(incident.status)}
          </span>
        </div>
        <p className="incident-detail__copy">
          {formatIncidentReason(
            incident.latestFailureReason,
            "No stored error detail is available for this outage."
          )}
        </p>
      </div>

      <dl className="incident-detail__grid">
        <div>
          <dt>Started</dt>
          <dd className="mono">{formatDateTime(incident.startedAt)}</dd>
        </div>
        <div>
          <dt>Last observed</dt>
          <dd className="mono">{formatDateTime(incident.lastObservedAt)}</dd>
        </div>
        <div>
          <dt>Recovered</dt>
          <dd className="mono">{formatDateTime(incident.resolvedAt)}</dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd className="mono">{formatDuration(incident.durationSeconds)}</dd>
        </div>
        <div>
          <dt>Samples</dt>
          <dd className="mono">{incident.sampleCount}</dd>
        </div>
        <div>
          <dt>Target</dt>
          <dd className="mono">{incident.externalTarget}</dd>
        </div>
        <div>
          <dt>Latest latency</dt>
          <dd className="mono">
            {incident.latestLatencyMs === null ? "No data" : `${incident.latestLatencyMs} ms`}
          </dd>
        </div>
        <div>
          <dt>Latest error</dt>
          <dd className="mono">{formatIncidentReason(incident.latestFailureReason, "No detail")}</dd>
        </div>
      </dl>

      <div className="incident-samples">
        <div className="incident-samples__header">
          <h3>Incident samples</h3>
          <span className="mono">{incident.samples.length} events</span>
        </div>
        <ul className="incident-samples__list" role="list">
          {incident.samples.map((sample) => (
            <li key={sample.observedAt} className="incident-samples__item">
              <div>
                <p className="mono incident-samples__time">{formatDateTime(sample.observedAt)}</p>
                <p className="incident-samples__reason">
                  {formatIncidentReason(sample.failureReason, "No detail")}
                </p>
              </div>
              <span className="mono incident-samples__latency">
                {sample.externalLatencyMs === null ? "--" : `${sample.externalLatencyMs} ms`}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
