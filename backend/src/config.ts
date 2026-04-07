import path from "node:path";

import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export interface AppConfig {
  host: string;
  port: number;
  frontendDistPath: string;
  monitor: {
    targets: string[];
    intervalSeconds: number;
    retentionDays: number;
    dbPath: string;
    staleAfterSeconds: number;
    noDataAfterSeconds: number;
    pingTimeoutMs: number;
    pingBinary: string;
    heartbeatSeconds: number;
    roundRobinEnabled: boolean;
    confirmDownAfter: number;
    confirmUpAfter: number;
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

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function parseHost(value: string | undefined, fallback: string): string {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : fallback;
}

function parseTargets(rawTargets: string | undefined, fallbackTargets: string[]): string[] {
  if (!rawTargets) {
    return fallbackTargets;
  }

  const parsed = rawTargets
    .split(",")
    .map((target) => target.trim())
    .filter((target) => target.length > 0);

  const deduped = [...new Set(parsed)];
  return deduped.length > 0 ? deduped : fallbackTargets;
}

export function loadConfig(): AppConfig {
  const intervalSeconds = parsePositiveInteger(process.env.MONITOR_INTERVAL_SECONDS, 5);
  const defaultNoDataAfterSeconds = intervalSeconds * 6;
  const staleAfterSeconds = parsePositiveInteger(
    process.env.MONITOR_STALE_AFTER_SECONDS,
    defaultNoDataAfterSeconds
  );
  const noDataAfterSeconds = parsePositiveInteger(
    process.env.MONITOR_NO_DATA_AFTER_SECONDS,
    staleAfterSeconds
  );
  const defaultTargets = ["1.1.1.1", "8.8.8.8", "1.0.0.1", "8.8.4.4"];
  const configuredTargets = parseTargets(
    process.env.MONITOR_TARGETS,
    process.env.MONITOR_TARGET?.trim() ? [process.env.MONITOR_TARGET.trim()] : defaultTargets
  );

  return {
    host: parseHost(process.env.HOST, "127.0.0.1"),
    port: parsePositiveInteger(process.env.PORT, 4044),
    frontendDistPath: path.resolve(__dirname, "../../frontend/dist"),
    monitor: {
      targets: configuredTargets,
      intervalSeconds,
      retentionDays: parsePositiveInteger(process.env.MONITOR_RETENTION_DAYS, 30),
      dbPath: path.resolve(process.cwd(), process.env.MONITOR_DB_PATH?.trim() || "data/network-sonar.sqlite"),
      staleAfterSeconds,
      noDataAfterSeconds,
      pingTimeoutMs: parsePositiveInteger(process.env.MONITOR_PING_TIMEOUT_MS, 3000),
      pingBinary: process.env.MONITOR_PING_BINARY?.trim() || "ping",
      heartbeatSeconds: 15,
      roundRobinEnabled: parseBoolean(process.env.MONITOR_ROUND_ROBIN_ENABLED, false),
      confirmDownAfter: parsePositiveInteger(process.env.MONITOR_CONFIRM_DOWN_AFTER, 2),
      confirmUpAfter: parsePositiveInteger(process.env.MONITOR_CONFIRM_UP_AFTER, 2)
    }
  };
}
