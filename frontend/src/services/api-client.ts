import type {
  BootstrapResponse,
  HistoryResponse,
  RangePreset
} from "../types/monitor";

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
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
