import type { ConnectionLogStore } from "../types/storage";

export class PurgeService {
  private nextPurgeAt = 0;

  public constructor(
    private readonly repository: ConnectionLogStore,
    private readonly retentionDays: number
  ) {}

  public purgeNow(nowUnixSeconds: number): number {
    this.nextPurgeAt = nowUnixSeconds + 60 * 60;
    return this.repository.purgeOlderThan(nowUnixSeconds - this.retentionDays * 24 * 60 * 60);
  }

  public maybePurge(nowUnixSeconds: number): number {
    if (nowUnixSeconds < this.nextPurgeAt) {
      return 0;
    }

    return this.purgeNow(nowUnixSeconds);
  }
}

