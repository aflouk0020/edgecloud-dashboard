import { apiRequest } from "./apiClient";

export function getActiveAlerts() {
  return apiRequest("/api/v1/alerts");
}

export function resolveAlert(id) {
  return apiRequest(
    `/api/v1/alerts/${id}/resolve`,
    {
      method: "PUT"
    }
  );
}
