import { apiRequest } from "./apiClient";
const policyPath = projectId => `/api/v2/projects/${encodeURIComponent(projectId)}/escalation-policy`;
export const getEscalationPolicy = projectId => apiRequest(policyPath(projectId));
export const saveEscalationPolicy = (projectId, policy, exists = false) => apiRequest(policyPath(projectId), { method: exists ? "PUT" : "POST", body: JSON.stringify(policy) });
export const setEscalationPolicyEnabled = (projectId, enabled) => apiRequest(`${policyPath(projectId)}/enabled`, { method: "PATCH", body: JSON.stringify({ enabled }) });
export const getAlertEscalationHistory = (projectId, alertId) => apiRequest(`/api/v2/projects/${encodeURIComponent(projectId)}/alerts/${encodeURIComponent(alertId)}/escalations`);
