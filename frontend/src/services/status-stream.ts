import type {
  MonitorSample,
  SettingsEventPayload,
  SnapshotEventPayload
} from "../types/monitor";

export interface StatusStreamHandlers {
  onOpen: () => void;
  onSnapshot: (payload: SnapshotEventPayload) => void;
  onSettings: (payload: SettingsEventPayload) => void;
  onSample: (payload: MonitorSample) => void;
  onHeartbeat: (payload: { now: number }) => void;
  onError: () => void;
}

function parsePayload<T>(event: MessageEvent<string>): T {
  return JSON.parse(event.data) as T;
}

export function connectStatusStream(handlers: StatusStreamHandlers): () => void {
  const source = new EventSource("/api/v1/events");

  source.onopen = handlers.onOpen;
  source.onerror = handlers.onError;
  source.addEventListener("snapshot", (event) => {
    handlers.onSnapshot(parsePayload<SnapshotEventPayload>(event as MessageEvent<string>));
  });
  source.addEventListener("settings", (event) => {
    handlers.onSettings(parsePayload<SettingsEventPayload>(event as MessageEvent<string>));
  });
  source.addEventListener("sample", (event) => {
    handlers.onSample(parsePayload<MonitorSample>(event as MessageEvent<string>));
  });
  source.addEventListener("heartbeat", (event) => {
    handlers.onHeartbeat(parsePayload<{ now: number }>(event as MessageEvent<string>));
  });

  return () => {
    source.close();
  };
}
