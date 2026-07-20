import { apiRequest } from "./apiClient";

export function getMonitoredServices() {
  return apiRequest("/api/v1/monitoring/services");
}

export function getServiceAvailability(serviceId) {
  return apiRequest(
    `/api/v1/monitoring/services/${serviceId}/availability`
  );
}

export function getServiceDowntimeHistory(serviceId) {
  return apiRequest(
    `/api/v1/monitoring/services/${serviceId}/downtime-history`
  );
}
