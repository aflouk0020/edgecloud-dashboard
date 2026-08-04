import { apiRequest } from "./apiClient";

function buildError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export async function getProjectDeviceHealth(projectId) {
  return apiRequest(`/api/v2/projects/${projectId}/device-health`);
}

export function normalizeProjectDeviceHealthError(error) {
  const status = error?.status || 0;

  if (status === 401) {
    return {
      status,
      title: "Authentication required",
      message: "Please sign in again to view this project device overview."
    };
  }

  if (status === 403) {
    return {
      status,
      title: "Access denied",
      message: "You do not have permission to view this project device overview."
    };
  }

  if (status === 404) {
    return {
      status,
      title: "Project not found",
      message: "The requested project device overview could not be found."
    };
  }

  if (status === 422) {
    return {
      status,
      title: "Archived project",
      message: "This project is archived. Device health is read-only."
    };
  }

  return {
    status,
    title: "Unable to load device overview",
    message: "Please try again once the Project Service is available."
  };
}

export function unavailableProjectDeviceHealthError(message) {
  return buildError(0, message);
}
