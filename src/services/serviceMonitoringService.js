import { apiRequest } from "./apiClient";

export function getMonitoredServices() {
  return apiRequest("/api/v1/monitoring/services");
}
