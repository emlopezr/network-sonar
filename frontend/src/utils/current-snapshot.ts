import type { CurrentStatusSnapshot } from "../types/monitor";

export function shouldMarkSnapshotStale(
  snapshot: CurrentStatusSnapshot | null,
  lastEventAt: number | null,
  now: number
): boolean {
  if (!snapshot || snapshot.status === "stale") {
    return false;
  }

  const freshestActivityAt = Math.max(snapshot.observedAt, lastEventAt ?? 0);
  return now - freshestActivityAt > snapshot.staleAfterSeconds;
}
