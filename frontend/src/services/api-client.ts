import type {
  BootstrapResponse,
  CreateMonitorProviderRequest,
  IncidentHistoryResponse,
  HistoryResponse,
  MonitorSettings,
  ReorderMonitorProvidersRequest,
  TimelineSegmentsResponse,
  UpdateMonitorProviderRequest,
  UpdateMonitorSettingsRequest,
  RangePreset
} from "../types/monitor";

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;

    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) {
        errorMessage = payload.error;
      }
    } catch {
      // Ignore invalid JSON bodies and keep the fallback message.
    }

    throw new Error(errorMessage);
  }

  return (await response.json()) as T;
}

export async function fetchBootstrap(range: RangePreset): Promise<BootstrapResponse> {
  const response = await fetch(`/api/v1/bootstrap?range=${range}`);
  return parseJsonResponse<BootstrapResponse>(response);
}

export async function fetchHistory(from: number, to: number): Promise<HistoryResponse> {
  const response = await fetch(`/api/v1/history?from=${from}&to=${to}`);
  return parseJsonResponse<HistoryResponse>(response);
}

export async function fetchHistorySegments(
  from: number,
  to: number
): Promise<TimelineSegmentsResponse> {
  const response = await fetch(`/api/v1/history/segments?from=${from}&to=${to}`);
  return parseJsonResponse<TimelineSegmentsResponse>(response);
}

export async function fetchIncidents(from: number, to: number): Promise<IncidentHistoryResponse> {
  const response = await fetch(`/api/v1/incidents?from=${from}&to=${to}`);
  return parseJsonResponse<IncidentHistoryResponse>(response);
}

export async function updateMonitorSettings(
  patch: UpdateMonitorSettingsRequest
): Promise<MonitorSettings> {
  const response = await fetch("/api/v1/monitor/settings", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(patch)
  });

  return parseJsonResponse<MonitorSettings>(response);
}

export async function fetchMonitorSettings(): Promise<MonitorSettings> {
  const response = await fetch("/api/v1/monitor/settings");
  return parseJsonResponse<MonitorSettings>(response);
}

export async function createMonitorProvider(
  payload: CreateMonitorProviderRequest
): Promise<MonitorSettings> {
  const response = await fetch("/api/v1/monitor/providers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return parseJsonResponse<MonitorSettings>(response);
}

export async function updateMonitorProvider(
  providerId: number,
  payload: UpdateMonitorProviderRequest
): Promise<MonitorSettings> {
  const response = await fetch(`/api/v1/monitor/providers/${providerId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return parseJsonResponse<MonitorSettings>(response);
}

export async function reorderMonitorProviders(
  payload: ReorderMonitorProvidersRequest
): Promise<MonitorSettings> {
  const response = await fetch("/api/v1/monitor/providers/order", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return parseJsonResponse<MonitorSettings>(response);
}

export async function deleteMonitorProvider(providerId: number): Promise<MonitorSettings> {
  const response = await fetch(`/api/v1/monitor/providers/${providerId}`, {
    method: "DELETE"
  });

  return parseJsonResponse<MonitorSettings>(response);
}
