import { apiRequest } from "./apiClient";

export async function getTelemetryHistory() {
  return apiRequest("/api/v1/monitoring/history");
}
