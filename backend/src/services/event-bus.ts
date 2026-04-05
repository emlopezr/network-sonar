import { EventEmitter } from "node:events";

import type { CurrentStatusSnapshot, PersistedMonitorSample } from "../types/monitor";

type EventMap = {
  snapshot: CurrentStatusSnapshot;
  sample: PersistedMonitorSample;
};

export class MonitorEventBus {
  private readonly emitter = new EventEmitter();

  public publishSnapshot(snapshot: CurrentStatusSnapshot): void {
    this.emitter.emit("snapshot", snapshot);
  }

  public publishSample(sample: PersistedMonitorSample): void {
    this.emitter.emit("sample", sample);
  }

  public subscribe<EventName extends keyof EventMap>(
    eventName: EventName,
    listener: (payload: EventMap[EventName]) => void
  ): () => void {
    this.emitter.on(eventName, listener);
    return () => {
      this.emitter.off(eventName, listener);
    };
  }
}
