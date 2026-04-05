import type { SnapshotStatus } from "../types/monitor";

const labels: Record<SnapshotStatus, string> = {
  ok: "Operativa",
  down: "Sin conexion",
  stale: "Desactualizada"
};

export function ConnectionBadge({ status }: { status: SnapshotStatus }) {
  return (
    <span className={`connection-badge connection-badge--${status}`}>
      <span className="connection-badge__dot" />
      {labels[status]}
    </span>
  );
}
