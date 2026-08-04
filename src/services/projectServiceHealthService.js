import { apiRequest } from "./apiClient";

function buildError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export async function getProjectServiceHealth(projectId) {
  return apiRequest(`/api/v2/projects/${projectId}/service-health`);
}

export function normalizeProjectServiceHealthError(error) {
  const status = error?.status || 0;

  if (status === 401) {
    return {
      status,
      title: "Authentication required",
      message: "Please sign in again to view this project service overview."
    };
  }

  if (status === 403) {
    return {
      status,
      title: "Access denied",
      message: "You do not have permission to view this project service overview."
    };
  }

  if (status === 404) {
    return {
      status,
      title: "Project not found",
      message: "The requested project service overview could not be found."
    };
  }

  if (status === 422) {
    return {
      status,
      title: "Archived project",
      message: "This project is archived. Service health is read-only."
    };
  }

  return {
    status,
    title: "Unable to load service overview",
    message: "Please try again once the Project Service is available."
  };
}

export function unavailableProjectServiceHealthError(message) {
  return buildError(0, message);
}
