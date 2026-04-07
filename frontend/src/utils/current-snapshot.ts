import type { CurrentStatusSnapshot } from "../types/monitor";

export function shouldMarkSnapshotStale(
  snapshot: CurrentStatusSnapshot | null,
  lastEventAt: number | null,
  now: number,
  includeHeartbeatActivity = true
): boolean {
  if (!snapshot || snapshot.status === "stale") {
    return false;
  }

  const freshestActivityAt = includeHeartbeatActivity
    ? Math.max(snapshot.observedAt, lastEventAt ?? 0)
    : snapshot.observedAt;
  return now - freshestActivityAt > snapshot.staleAfterSeconds;
}
