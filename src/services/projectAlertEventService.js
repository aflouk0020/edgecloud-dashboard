import { apiRequest } from "./apiClient";

const DEFAULT_PAGE = 0;
const DEFAULT_SIZE = 20;
const MAX_SIZE = 100;

function path(projectId, alertId = "") {
  const base = `/api/v2/projects/${encodeURIComponent(projectId)}/alerts`;
  return alertId ? `${base}/${encodeURIComponent(alertId)}` : base;
}

function normalizeAlert(alert = {}) {
  return { ...alert, id: alert.id ?? alert.alertId };
}

export function listProjectAlerts(projectId, filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (!["page", "size", "sortDirection"].includes(key) && value !== "" && value !== null && value !== undefined) {
      params.set(key, value);
    }
  });
  params.set("page", Math.max(0, Number(filters.page ?? DEFAULT_PAGE)));
  params.set("size", Math.min(MAX_SIZE, Math.max(1, Number(filters.size ?? DEFAULT_SIZE))));
  params.set("sortDirection", filters.sortDirection || "DESC");

  return apiRequest(`${path(projectId)}?${params}`).then(payload => ({
    alerts: (payload.alerts ?? payload.content ?? []).map(normalizeAlert),
    page: payload.page ?? DEFAULT_PAGE,
    size: payload.size ?? DEFAULT_SIZE,
    totalElements: payload.totalElements ?? 0,
    totalPages: payload.totalPages ?? 0
  }));
}

export function getProjectAlert(projectId, alertId) {
  return apiRequest(path(projectId, alertId)).then(normalizeAlert);
}

export function normalizeProjectAlertEventError(error) {
  const status = error?.status || Number(String(error?.message || "").match(/(\d{3})/)?.[1] || 0);
  if (status === 401) return { status, title: "Authentication required", message: "Please sign in again to view project alerts." };
  if (status === 403) return { status, title: "Access denied", message: "You do not have permission to view alerts for this project." };
  if (status === 404) return { status, title: "Alert not found", message: "The requested project alert could not be found." };
  if (status === 422) return { status, title: "Archived project", message: "Alert history is unavailable for this archived project." };
  return { status, title: "Unable to load project alerts", message: "Please try again once the Alert Service is available." };
}
