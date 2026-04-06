import type { TimelineSegment } from "../types/monitor";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium"
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  timeStyle: "medium"
});

function formatTimestamp(unixSeconds: number): { date: string; time: string } {
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
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;

    return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
  }

  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);

  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

export function InspectorPanel({
  segment
}: {
  segment: TimelineSegment | null;
}) {
  if (!segment) {
    return (
      <section className="inspector-panel" aria-live="polite">
        <p className="timeline__summary">Waiting for segment selection</p>
      </section>
    );
  }

  const startedAt = formatTimestamp(segment.startedAt);
  const endedAt = segment.endedAt === null ? null : formatTimestamp(segment.endedAt);
  const averageLatency =
    segment.status === "ok" && segment.latestLatencyMs !== null
      ? `${segment.latestLatencyMs} ms`
      : "No data";

  return (
    <section className="inspector-panel inspector-panel--segment" aria-live="polite">
      <dl className="inspector-panel__grid">
        <div>
          <dt>Started</dt>
          <dd className="mono incident-overview__timestamp">
            <span className="incident-overview__timestamp-date">{startedAt.date}</span>
            <span className="incident-overview__timestamp-time">{startedAt.time}</span>
          </dd>
        </div>
        <div>
          <dt>Ended</dt>
          <dd className="mono incident-overview__timestamp">
            {endedAt ? (
              <>
                <span className="incident-overview__timestamp-date">{endedAt.date}</span>
                <span className="incident-overview__timestamp-time">{endedAt.time}</span>
              </>
            ) : (
              <span className="inspector-panel__timestamp-state">Ongoing</span>
            )}
          </dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd className={`mono inspector-panel__status inspector-panel__status--${segment.status}`}>
            {formatDuration(Math.max(1, segment.durationSeconds))}
          </dd>
        </div>
        <div>
          <dt>Samples</dt>
          <dd className="mono">{segment.sampleCount}</dd>
        </div>
        <div>
          <dt>Avg Latency</dt>
          <dd className="mono">{averageLatency}</dd>
        </div>
      </dl>
    </section>
  );
}
