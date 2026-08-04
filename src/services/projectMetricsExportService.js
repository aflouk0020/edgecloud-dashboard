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
  appendIfPresent(searchParams, "deviceId", params.deviceId);
  appendIfPresent(searchParams, "serviceId", params.serviceId);
  appendIfPresent(searchParams, "sortDirection", params.sortDirection);

  (params.metricTypes || []).forEach(metricType => {
    appendIfPresent(searchParams, "metricTypes", metricType);
  });

  return searchParams.toString();
}

function sanitizeFilename(filename) {
  return String(filename || "")
    .replace(/[\r\n"]/g, "_")
    .replace(/[\\/]/g, "_")
    .replace(/\.\./g, "_")
    .trim();
}

function parseContentDispositionFilename(headerValue) {
  if (!headerValue) {
    return "";
  }

  const quotedMatch = headerValue.match(/filename\*?=([^;]+)/i);
  if (!quotedMatch) {
    return "";
  }

  let filename = quotedMatch[1].trim();
  if (filename.startsWith("UTF-8''")) {
    filename = decodeURIComponent(filename.slice(7));
  }

  if (filename.startsWith("\"") && filename.endsWith("\"")) {
    filename = filename.slice(1, -1);
  }

  return sanitizeFilename(filename);
}

export function getProjectMetricsExportFilename(response, fallback = "edgecloud-project-metrics.csv") {
  const headerFilename = parseContentDispositionFilename(
    response?.headers?.get?.("content-disposition")
    || response?.headers?.get?.("Content-Disposition")
    || ""
  );

  return headerFilename || fallback;
}

export async function exportProjectMetrics(projectId, params = {}, options = {}) {
  const query = buildQueryString(params);
  const response = await apiRequest(
    `/api/v2/projects/${projectId}/metrics/export${query ? `?${query}` : ""}`,
    {
      ...options,
      responseType: "raw"
    }
  );

  if (!response.ok) {
    const error = new Error(`API request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const blob = await response.blob();
  return {
    response,
    blob,
    filename: getProjectMetricsExportFilename(response)
  };
}

export function normalizeProjectMetricsExportError(error) {
  const status = error?.status || 0;

  if (status === 401) {
    return {
      status,
      title: "Authentication required",
      message: "Please sign in again to export project metrics."
    };
  }

  if (status === 403) {
    return {
      status,
      title: "Access denied",
      message: "You do not have permission to export this project history."
    };
  }

  if (status === 404) {
    return {
      status,
      title: "Project not found",
      message: "The requested project could not be found for export."
    };
  }

  if (status === 400) {
    return {
      status,
      title: "Invalid export request",
      message: "Please adjust the selected export filters and try again."
    };
  }

  if (status === 422) {
    return {
      status,
      title: "No exportable data",
      message: "No historical metrics were available for the selected range."
    };
  }

  if (status === 503) {
    return {
      status,
      title: "Export unavailable",
      message: "Project metrics export is temporarily unavailable."
    };
  }

  return {
    status,
    title: "Unable to export historical metrics",
    message: "Please try again once the Project Service is available."
  };
}
