import type { RangePreset } from "../types/monitor";

export function getRangeSeconds(range: RangePreset): number {
  switch (range) {
    case "1h":
      return 60 * 60;
    case "6h":
      return 6 * 60 * 60;
    case "24h":
      return 24 * 60 * 60;
    case "7d":
      return 7 * 24 * 60 * 60;
    case "30d":
      return 30 * 24 * 60 * 60;
  }
}

export function getRangeCopy(range: RangePreset): string {
  switch (range) {
    case "1h":
      return "last 1 hour";
    case "6h":
      return "last 6 hours";
    case "24h":
      return "last 24 hours";
    case "7d":
      return "last 7 days";
    case "30d":
      return "last 30 days";
  }
}

export function getRangeLabel(range: RangePreset): string {
  switch (range) {
    case "1h":
      return "Last hour";
    case "6h":
      return "Last 6 hours";
    case "24h":
      return "Last 24 hours";
    case "7d":
      return "Last 7 days";
    case "30d":
      return "Last 30 days";
  }
}
