import path from "node:path";

import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export interface AppConfig {
  port: number;
  frontendDistPath: string;
  monitor: {
    targets: string[];
    intervalSeconds: number;
    retentionDays: number;
    dbPath: string;
    staleAfterSeconds: number;
    pingTimeoutMs: number;
    pingBinary: string;
    heartbeatSeconds: number;
    roundRobinEnabled: boolean;
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
  const staleAfterSeconds = parsePositiveInteger(
    process.env.MONITOR_STALE_AFTER_SECONDS,
    intervalSeconds * 3
  );
  const defaultTargets = ["1.1.1.1", "8.8.8.8", "1.0.0.1", "8.8.4.4"];
  const configuredTargets = parseTargets(
    process.env.MONITOR_TARGETS,
    process.env.MONITOR_TARGET?.trim() ? [process.env.MONITOR_TARGET.trim()] : defaultTargets
  );

  return {
    port: parsePositiveInteger(process.env.PORT, 4173),
    frontendDistPath: path.resolve(__dirname, "../../frontend/dist"),
    monitor: {
      targets: configuredTargets,
      intervalSeconds,
      retentionDays: parsePositiveInteger(process.env.MONITOR_RETENTION_DAYS, 30),
      dbPath: path.resolve(process.cwd(), process.env.MONITOR_DB_PATH?.trim() || "data/network-sonar.sqlite"),
      staleAfterSeconds,
      pingTimeoutMs: parsePositiveInteger(process.env.MONITOR_PING_TIMEOUT_MS, 3000),
      pingBinary: process.env.MONITOR_PING_BINARY?.trim() || "ping",
      heartbeatSeconds: 15,
      roundRobinEnabled: parseBoolean(process.env.MONITOR_ROUND_ROBIN_ENABLED, false)
    }
  };
}
