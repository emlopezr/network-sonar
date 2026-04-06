import type { MonitorSample } from "../types/monitor";

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

function getStatusLabel(status: MonitorSample["status"]): string {
  switch (status) {
    case "ok":
      return "OK";
    case "down":
      return "DOWN";
  }
}

export function InspectorPanel({
  sample,
  sampleIndex
}: {
  sample: MonitorSample | null;
  sampleIndex: number;
}) {
  const resolvedSampleIndex = sampleIndex < 0 ? 0 : sampleIndex;
  const timestamp = sample ? formatTimestamp(sample.observedAt) : null;

  if (!sample) {
    return (
      <section className="inspector-panel" aria-live="polite">
        <div className="inspector-panel__tag">
          <span className="inspector-panel__icon" aria-hidden="true" />
          <div>
            <div className="inspector-panel__label">Inspector</div>
            <div className="inspector-panel__title">Waiting for sample selection</div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="inspector-panel" aria-live="polite">
      <div className="inspector-panel__tag">
        <span className="inspector-panel__icon" aria-hidden="true" />
        <div>
          <div className="inspector-panel__label">Inspector</div>
          <div className="inspector-panel__title mono">Sample #{resolvedSampleIndex + 1}</div>
        </div>
      </div>
      <dl className="inspector-panel__grid">
        <div>
          <dt>Timestamp</dt>
          <dd className="mono inspector-panel__timestamp">
            <span>{timestamp?.date}</span>
            <span>{timestamp?.time}</span>
          </dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd className={`mono inspector-panel__status inspector-panel__status--${sample.status}`}>
            {getStatusLabel(sample.status)}
          </dd>
        </div>
        <div>
          <dt>Latency</dt>
          <dd className="mono">
            {sample.externalLatencyMs === null ? "No data" : `${sample.externalLatencyMs} ms`}
          </dd>
        </div>
        <div>
          <dt>Diagnostic</dt>
          <dd className="mono inspector-panel__diagnostic">
            {sample.failureReason ?? "PING Successful"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
