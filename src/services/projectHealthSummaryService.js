import { apiRequest } from "./apiClient";

function buildError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export async function getProjectHealthSummary(projectId) {
  return apiRequest(`/api/v2/projects/${projectId}/health-summary`);
}

export function normalizeProjectHealthSummaryError(error) {
  const status = error?.status || 0;

  if (status === 401) {
    return {
      status,
      title: "Authentication required",
      message: "Please sign in again to view this project health summary."
    };
  }

  if (status === 403) {
    return {
      status,
      title: "Access denied",
      message: "You do not have permission to view this project health summary."
    };
  }

  if (status === 404) {
    return {
      status,
      title: "Project not found",
      message: "The requested project health summary could not be found."
    };
  }

  if (status === 422) {
    return {
      status,
      title: "Archived project",
      message: "This project is archived. Health data is read-only."
    };
  }

  return {
    status,
    title: "Unable to load health summary",
    message: "Please try again once the Project Service is available."
  };
}

export function unavailableHealthSummaryError(message) {
  return buildError(0, message);
}
