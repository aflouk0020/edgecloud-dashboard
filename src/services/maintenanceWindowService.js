import { apiRequest } from "./apiClient";

const basePath = projectId => `/api/v2/projects/${encodeURIComponent(projectId)}/maintenance-windows`;

export const getMaintenanceWindows = projectId => apiRequest(basePath(projectId));
export const createMaintenanceWindow = (projectId, payload) => apiRequest(basePath(projectId), {
  method: "POST", body: JSON.stringify(payload)
});
export const updateMaintenanceWindow = (projectId, windowId, payload) => apiRequest(
  `${basePath(projectId)}/${encodeURIComponent(windowId)}`, { method: "PUT", body: JSON.stringify(payload) }
);
export const deleteMaintenanceWindow = (projectId, windowId) => apiRequest(
  `${basePath(projectId)}/${encodeURIComponent(windowId)}`, { method: "DELETE", responseType: "raw" }
);
export const getMaintenanceSuppressions = (projectId, windowId) => apiRequest(
  `${basePath(projectId)}/${encodeURIComponent(windowId)}/suppressions`
);

export function normalizeMaintenanceWindowError(error) {
  const status = Number(String(error?.message || "").match(/(\d{3})/)?.[1] || error?.status || 0);
  if (status === 401) return { title: "Authentication required", message: "Please sign in again." };
  if (status === 403) return { title: "Access denied", message: "You do not have permission to manage maintenance windows." };
  if (status === 404) return { title: "Maintenance window not found", message: "The project or maintenance window is unavailable." };
  if (status === 400) return { title: "Invalid maintenance window", message: "Check its scope and time range." };
  return { title: "Unable to load maintenance windows", message: "Please try again once the Alert Service is available." };
}
