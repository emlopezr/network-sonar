import { startTransition, useEffect, useState } from "react";

import type { AppPath } from "../components/app-shell";
import { AppShell } from "../components/app-shell";
import { IncidentDetailPanel } from "../components/incident-detail-panel";
import { Legend } from "../components/legend";
import { fetchBootstrap, fetchIncidents } from "../services/api-client";
import type {
  BootstrapResponse,
  IncidentHistoryResponse,
  OutageIncident,
  RangePreset
} from "../types/monitor";
import { rangePresets } from "../types/monitor";
import { getRangeLabel, getRangeSeconds } from "../utils/range";

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short"
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium"
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  timeStyle: "short"
});

function formatDateTime(unixSeconds: number): string {
  return dateTimeFormatter.format(new Date(unixSeconds * 1000));
}

function formatDateParts(unixSeconds: number): { date: string; time: string } {
  const value = new Date(unixSeconds * 1000);

  return {
    date: dateFormatter.format(value),
    time: timeFormatter.format(value)
  };
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

function getIncidentStatusCopy(status: OutageIncident["status"]): string {
  return status === "ongoing" ? "Ongoing" : "Resolved";
}

function getLastIncidentCopy(incident: OutageIncident | null): string {
  if (!incident) {
    return "No outages in range";
  }

  return formatDateTime(incident.startedAt);
}

export function IncidentsPage({
  onNavigate = () => undefined
}: {
  onNavigate?: (path: AppPath) => void;
}) {
  const [range, setRange] = useState<RangePreset>("24h");
  const [incidents, setIncidents] = useState<OutageIncident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<OutageIncident | null>(null);
  const [retentionDays, setRetentionDays] = useState(30);
  const [sampleIntervalSeconds, setSampleIntervalSeconds] = useState(5);
  const [error, setError] = useState<string | null>(null);

  const rangeWindow = getRangeSeconds(range);
  const orderedIncidents = [...incidents].sort((left, right) => right.startedAt - left.startedAt);
  const totalDowntimeSeconds = orderedIncidents.reduce(
    (accumulator, incident) => accumulator + incident.durationSeconds,
    0
  );

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setError(null);

      try {
        const to = Math.floor(Date.now() / 1000);
        const from = to - rangeWindow;
        const [bootstrap, payload]: [BootstrapResponse, IncidentHistoryResponse] = await Promise.all([
          fetchBootstrap("1h"),
          fetchIncidents(from, to)
        ]);

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setIncidents(payload.incidents);
          setSelectedIncident((previous) => {
            if (!previous) {
              return payload.incidents[payload.incidents.length - 1] ?? null;
            }

            return (
              payload.incidents.find((incident) => incident.startedAt === previous.startedAt) ??
              payload.incidents[payload.incidents.length - 1] ??
              null
            );
          });
          setRetentionDays(bootstrap.retentionDays);
          setSampleIntervalSeconds(bootstrap.sampleIntervalSeconds);
        });
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load outage history.");
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [range, rangeWindow]);

  async function refreshIncidents(): Promise<void> {
    setError(null);

    try {
      const to = Math.floor(Date.now() / 1000);
      const from = to - rangeWindow;
      const payload = await fetchIncidents(from, to);

      startTransition(() => {
        setIncidents(payload.incidents);
        setSelectedIncident(
          payload.incidents.find((incident) => incident.startedAt === selectedIncident?.startedAt) ??
            payload.incidents[payload.incidents.length - 1] ??
            null
        );
      });
    } catch (refreshError) {
      setError(
        refreshError instanceof Error ? refreshError.message : "Could not refresh outage history."
      );
    }
  }

  return (
    <AppShell
      activePage="incidents"
      onNavigate={onNavigate}
      topbarContent={
        <div className="dashboard-topbar__context">
          <span className="dashboard-topbar__context-mark" aria-hidden="true" />
          <span className="mono">INCIDENT HISTORY</span>
        </div>
      }
    >
      <main className="dashboard-content dashboard-content--incidents">
        {error ? (
          <section className="error-banner">
            <span className="error-banner__label">Alert</span>
            <p>{error}</p>
          </section>
        ) : null}

        <section className="incident-overview">
          <article className="incident-overview__card">
            <span className="incident-overview__label">Detected outages</span>
            <strong className="mono">{orderedIncidents.length}</strong>
            <p>{getRangeLabel(range)}</p>
          </article>
          <article className="incident-overview__card">
            <span className="incident-overview__label">Total downtime</span>
            <strong className="mono">{formatDuration(totalDowntimeSeconds)}</strong>
            <p>Visible sum for the current range</p>
          </article>
          <article className="incident-overview__card">
            <span className="incident-overview__label">Latest outage</span>
            {orderedIncidents[0] ? (
              <strong className="mono incident-overview__timestamp">
                <span className="incident-overview__timestamp-date">
                  {formatDateParts(orderedIncidents[0].startedAt).date}
                </span>
                <span className="incident-overview__timestamp-time">
                  {formatDateParts(orderedIncidents[0].startedAt).time}
                </span>
              </strong>
            ) : (
              <strong className="mono">{getLastIncidentCopy(null)}</strong>
            )}
            <p>{orderedIncidents[0] ? getIncidentStatusCopy(orderedIncidents[0].status) : "No incidents"}</p>
          </article>
        </section>

        <section className="control-bar">
          <div className="control-bar__ranges" role="tablist" aria-label="Incident range">
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
            <span className="incident-range-copy mono">{getRangeLabel(range)}</span>
            <span className="control-bar__divider" aria-hidden="true" />
            <button type="button" className="control-bar__refresh mono" onClick={() => void refreshIncidents()}>
              Refresh
            </button>
          </div>
        </section>

        <section className="incident-layout">
          <section className="incident-list-panel">
            <div className="incident-list-panel__header">
              <div>
                <p className="eyebrow">Log</p>
                <h2>Grouped outages</h2>
              </div>
              <span className="mono incident-list-panel__count">{orderedIncidents.length} incidents</span>
            </div>

            {orderedIncidents.length === 0 ? (
              <div className="timeline-empty">
                <p className="eyebrow">No outages</p>
                <h3>No incidents in the selected range</h3>
                <p className="timeline__summary">
                  Change the range to inspect earlier periods or refresh again if you expect more data.
                </p>
              </div>
            ) : (
              <ul className="incident-list" role="list" aria-label="Outage list">
                {orderedIncidents.map((incident) => (
                  <li key={incident.startedAt}>
                    <button
                      type="button"
                      className={`incident-list__item${selectedIncident?.startedAt === incident.startedAt ? " is-selected" : ""}`}
                      onClick={() => setSelectedIncident(incident)}
                    >
                      <div className="incident-list__headline">
                        <p className="mono incident-list__timestamp">
                          {formatDateTime(incident.startedAt)} // {formatDuration(incident.durationSeconds)}
                        </p>
                        <span className={`incident-list__status incident-list__status--${incident.status}`}>
                          {getIncidentStatusCopy(incident.status)}
                        </span>
                      </div>
                      <div className="incident-list__meta mono">
                        <span>{incident.sampleCount} samples</span>
                        <span>{incident.externalTarget}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <IncidentDetailPanel incident={selectedIncident} />
        </section>

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
