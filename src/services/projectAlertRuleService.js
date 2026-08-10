import { apiRequest } from "./apiClient";

function path(projectId, suffix = "") {
  return `/api/v2/projects/${projectId}/alert-rules${suffix}`;
}

export function getProjectAlertRules(projectId) {
  return apiRequest(path(projectId));
}

export function createProjectAlertRule(projectId, rule) {
  return apiRequest(path(projectId), {
    method: "POST",
    body: JSON.stringify(rule)
  });
}

export function getProjectAlertRule(projectId, ruleId) {
  return apiRequest(path(projectId, `/${ruleId}`));
}

export function updateProjectAlertRule(projectId, ruleId, rule) {
  return apiRequest(path(projectId, `/${ruleId}`), {
    method: "PUT",
    body: JSON.stringify(rule)
  });
}

export function updateProjectAlertRuleEnabled(projectId, ruleId, enabled) {
  return apiRequest(path(projectId, `/${ruleId}/enabled`), {
    method: "PATCH",
    body: JSON.stringify({ enabled })
  });
}

export function deleteProjectAlertRule(projectId, ruleId) {
  return apiRequest(path(projectId, `/${ruleId}`), {
    method: "DELETE",
    responseType: "raw"
  });
}

export function normalizeProjectAlertRuleError(error) {
  const status = error?.status || Number(String(error?.message || "").match(/(\d{3})/)?.[1] || 0);

  if (status === 401) {
    return { status, title: "Authentication required", message: "Please sign in again to manage alert rules." };
  }
  if (status === 403) {
    return { status, title: "Access denied", message: "You do not have permission to manage alert rules for this project." };
  }
  if (status === 404) {
    return { status, title: "Project or rule not found", message: "The requested alert rule could not be found." };
  }
  if (status === 422) {
    return { status, title: "Archived project", message: "Alert rules cannot be changed for an archived project." };
  }
  if (status === 400) {
    return { status, title: "Invalid alert rule", message: "Check the rule values and try again." };
  }
  return { status, title: "Unable to load alert rules", message: "Please try again once the Alert Service is available." };
}