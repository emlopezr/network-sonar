import net from "node:net";

import { MonitorSettingsError } from "./monitor-settings-service";

const HOSTNAME_PATTERN = /^(?=.{1,253}$)(?!-)(?:[a-zA-Z0-9-]{1,63}\.)*[a-zA-Z0-9-]{1,63}$/;
const HOSTNAME_LABEL_PATTERN = /^(?!-)[a-zA-Z0-9-]{1,63}(?<!-)$/;

function normalizeText(value: string): string {
  return value.trim();
}

export function normalizeProviderLabel(value: string): string {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    throw new MonitorSettingsError("Label must not be empty.", 400);
  }

  if (normalizedValue.length > 80) {
    throw new MonitorSettingsError("Label must be 80 characters or fewer.", 400);
  }

  return normalizedValue;
}

export function normalizeProviderTarget(value: string): string {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    throw new MonitorSettingsError("Target must not be empty.", 400);
  }

  if (normalizedValue.length > 253) {
    throw new MonitorSettingsError("Target must be 253 characters or fewer.", 400);
  }

  if (
    normalizedValue.includes("://") ||
    normalizedValue.includes("/") ||
    normalizedValue.includes("?") ||
    normalizedValue.includes("#") ||
    normalizedValue.includes("@")
  ) {
    throw new MonitorSettingsError("Target must be a hostname or IP address only.", 400);
  }

  if (net.isIP(normalizedValue) !== 0) {
    return normalizedValue;
  }

  if (!HOSTNAME_PATTERN.test(normalizedValue)) {
    throw new MonitorSettingsError("Target must be a valid hostname or IP address.", 400);
  }

  const labels = normalizedValue.split(".");

  if (!labels.every((label) => HOSTNAME_LABEL_PATTERN.test(label))) {
    throw new MonitorSettingsError("Target must be a valid hostname or IP address.", 400);
  }

  return normalizedValue;
}

export function normalizeOptionalLogoUrl(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }

  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return null;
  }

  if (normalizedValue.length > 2048) {
    throw new MonitorSettingsError("Logo URL must be 2048 characters or fewer.", 400);
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(normalizedValue);
  } catch {
    throw new MonitorSettingsError("Logo URL must be a valid absolute URL.", 400);
  }

  if (parsedUrl.protocol === "https:") {
    return parsedUrl.toString();
  }

  if (
    parsedUrl.protocol === "http:" &&
    (parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1")
  ) {
    return parsedUrl.toString();
  }

  throw new MonitorSettingsError(
    "Logo URL must use https or local http on localhost/127.0.0.1.",
    400
  );
}
