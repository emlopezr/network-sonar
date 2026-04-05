import path from "node:path";

import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export interface AppConfig {
  port: number;
  frontendDistPath: string;
  monitor: {
    target: string;
    intervalSeconds: number;
    retentionDays: number;
    dbPath: string;
    staleAfterSeconds: number;
    pingTimeoutMs: number;
    pingBinary: string;
    heartbeatSeconds: number;
  };
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export function loadConfig(): AppConfig {
  const intervalSeconds = parsePositiveInteger(process.env.MONITOR_INTERVAL_SECONDS, 5);
  const staleAfterSeconds = parsePositiveInteger(
    process.env.MONITOR_STALE_AFTER_SECONDS,
    intervalSeconds * 3
  );

  return {
    port: parsePositiveInteger(process.env.PORT, 4173),
    frontendDistPath: path.resolve(__dirname, "../../frontend/dist"),
    monitor: {
      target: process.env.MONITOR_TARGET?.trim() || "1.1.1.1",
      intervalSeconds,
      retentionDays: parsePositiveInteger(process.env.MONITOR_RETENTION_DAYS, 30),
      dbPath: path.resolve(process.cwd(), process.env.MONITOR_DB_PATH?.trim() || "data/network-sonar.sqlite"),
      staleAfterSeconds,
      pingTimeoutMs: parsePositiveInteger(process.env.MONITOR_PING_TIMEOUT_MS, 3000),
      pingBinary: process.env.MONITOR_PING_BINARY?.trim() || "ping",
      heartbeatSeconds: 15
    }
  };
}
