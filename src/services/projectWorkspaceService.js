import API_BASE_URL from "../config/apiConfig";

function buildError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function extractStatus(error) {
  const match = String(error?.message || "").match(/API request failed: (\d{3})/);
  return match ? Number(match[1]) : 0;
}

export async function getProjectWorkspace(projectId) {
  const token = localStorage.getItem("token");

  const response = await fetch(
    `${API_BASE_URL}/api/v2/projects/${projectId}/workspace`,
    {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    }
  );

  if (!response.ok) {
    throw buildError(response.status, response.statusText || "Request failed");
  }

  return response.json();
}

export function normalizeWorkspaceError(error) {
  const status = error?.status || extractStatus(error);

  if (status === 401) {
    return {
      status,
      title: "Authentication required",
      message: "Please sign in again to view this project workspace."
    };
  }

  if (status === 403) {
    return {
      status,
      title: "Access denied",
      message: "You do not have permission to view this project workspace."
    };
  }

  if (status === 404) {
    return {
      status,
      title: "Project not found",
      message: "The requested project workspace could not be found."
    };
  }

  if (status === 422) {
    return {
      status,
      title: "Archived project",
      message: "This project is archived. Workspace data is read-only."
    };
  }

  return {
    status,
    title: "Unable to load workspace",
    message: "Please try again once the Project Service is available."
  };
}
