declare namespace NodeJS {
  interface ProcessEnv {
    PORT?: string;
    MONITOR_TARGET?: string;
    MONITOR_INTERVAL_SECONDS?: string;
    MONITOR_RETENTION_DAYS?: string;
    MONITOR_DB_PATH?: string;
    MONITOR_STALE_AFTER_SECONDS?: string;
    MONITOR_PING_TIMEOUT_MS?: string;
    MONITOR_PING_BINARY?: string;
  }
}
