import type { SnapshotStatus } from "../types/monitor";

const labels: Record<SnapshotStatus, string> = {
  ok: "Operational",
  down: "Offline",
  stale: "Stale"
};

export function ConnectionBadge({ status }: { status: SnapshotStatus }) {
  return (
    <span className={`connection-badge connection-badge--${status}`}>
      <span className="connection-badge__dot" />
      <span className="connection-badge__label">{labels[status]}</span>
    </span>
  );
}
