import { apiRequest } from "./apiClient";

export function getMonitoringAnalytics() {
  return apiRequest("/api/v1/monitoring/analytics");
}

export function getDeviceSummary() {
  return apiRequest("/api/v1/devices/summary");
}

export function getAlertSummary() {
  return apiRequest("/api/v1/alerts/summary");
}
