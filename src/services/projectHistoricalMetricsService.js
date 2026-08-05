import { apiRequest } from "./apiClient";

function appendIfPresent(searchParams, key, value) {
  if (value !== undefined && value !== null && value !== "") {
    searchParams.append(key, String(value));
  }
}

function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams();

  appendIfPresent(searchParams, "from", params.from);
  appendIfPresent(searchParams, "to", params.to);
  appendIfPresent(searchParams, "serviceId", params.serviceId);
  appendIfPresent(searchParams, "deviceId", params.deviceId);
  appendIfPresent(searchParams, "sortDirection", params.sortDirection);

  (params.metricTypes || []).forEach(metricType => {
    appendIfPresent(searchParams, "metricTypes", metricType);
  });

  appendIfPresent(searchParams, "page", params.page);
  appendIfPresent(searchParams, "size", params.size);

  return searchParams.toString();
}

function buildError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export async function getProjectHistoricalMetrics(projectId, params = {}, options = {}) {
  const query = buildQueryString(params);
  const endpoint = `/api/v2/projects/${projectId}/historical-metrics${query ? `?${query}` : ""}`;
  return apiRequest(endpoint, options);
}

export function normalizeProjectHistoricalMetricsError(error) {
  const status = error?.status || 0;

  if (status === 401) {
    return {
      status,
      title: "Authentication required",
      message: "Please sign in again to view this project history."
    };
  }

  if (status === 403) {
    return {
      status,
      title: "Access denied",
      message: "You do not have permission to view this project history."
    };
  }

  if (status === 404) {
    return {
      status,
      title: "Project not found",
      message: "The requested project history could not be found."
    };
  }

  if (status === 400) {
    return {
      status,
      title: "Invalid date range",
      message: "Please adjust the selected date range and try again."
    };
  }

  if (status === 422) {
    return {
      status,
      title: "Archived project",
      message: "This project is archived. Historical data is read-only."
    };
  }

  return {
    status,
    title: "Unable to load historical metrics",
    message: "Please try again once the Project Service is available."
  };
}

export function unavailableHistoricalMetricsError(message) {
  return buildError(0, message);
}
