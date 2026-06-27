import { apiRequest } from "./apiClient";

export async function getDevices() {
  return apiRequest("/api/v1/devices");
}

export async function getTelemetryHistory() {
  return apiRequest("/api/v1/monitoring/history");
}

export async function getActiveAlerts() {
  return apiRequest("/api/v1/alerts");
}
