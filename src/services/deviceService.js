import { apiRequest } from "./apiClient";

export async function getDevices() {
  return apiRequest("/api/v1/devices");
}

export async function getDeviceInventory({ search = "", page = 0, size = 20, sort = "name", direction = "asc", projectId = "", groupId = "", tagIds = [] } = {}) {
  const params = new URLSearchParams({ search, page, size, sort, direction });
  if (projectId) params.set("projectId", projectId);
  if (groupId) params.set("groupId", groupId);
  tagIds.forEach(id => params.append("tagIds", id));
  return apiRequest(`/api/v1/devices/inventory?${params.toString()}`);
}

const managementPath = "/api/v1/devices/management";
const organisationPath = projectId => `${managementPath}/projects/${encodeURIComponent(projectId)}`;
export const getAccessibleProjects = () => apiRequest("/api/v2/projects");
export const getDeviceGroups = (projectId, search = "") => apiRequest(`${organisationPath(projectId)}/groups?search=${encodeURIComponent(search)}`);
export const createDeviceGroup = (projectId, payload) => apiRequest(`${organisationPath(projectId)}/groups`, { method: "POST", body: JSON.stringify(payload) });
export const updateDeviceGroup = (projectId, id, payload) => apiRequest(`${organisationPath(projectId)}/groups/${id}`, { method: "PUT", body: JSON.stringify(payload) });
export const deleteDeviceGroup = (projectId, id) => apiRequest(`${organisationPath(projectId)}/groups/${id}`, { method: "DELETE" });
export const getGroupMembers = (projectId, id) => apiRequest(`${organisationPath(projectId)}/groups/${id}/devices`);
export const assignGroupDevices = (projectId, id, deviceIds) => apiRequest(`${organisationPath(projectId)}/groups/${id}/devices`, { method: "POST", body: JSON.stringify({ deviceIds }) });
export const removeGroupDevice = (projectId, id, deviceId) => apiRequest(`${organisationPath(projectId)}/groups/${id}/devices/${deviceId}`, { method: "DELETE" });
export const getDeviceTags = (projectId, search = "") => apiRequest(`${organisationPath(projectId)}/tags?search=${encodeURIComponent(search)}`);
export const createDeviceTag = (projectId, payload) => apiRequest(`${organisationPath(projectId)}/tags`, { method: "POST", body: JSON.stringify(payload) });
export const updateDeviceTag = (projectId, id, payload) => apiRequest(`${organisationPath(projectId)}/tags/${id}`, { method: "PUT", body: JSON.stringify(payload) });
export const deleteDeviceTag = (projectId, id) => apiRequest(`${organisationPath(projectId)}/tags/${id}`, { method: "DELETE" });
export const getAssignedDeviceTags = (projectId, deviceId) => apiRequest(`${organisationPath(projectId)}/devices/${deviceId}/tags`);
export const assignDeviceTags = (projectId, deviceId, tagIds) => apiRequest(`${organisationPath(projectId)}/devices/${deviceId}/tags`, { method: "PUT", body: JSON.stringify({ tagIds }) });
export const registerDevice = payload => apiRequest(managementPath, { method: "POST", body: JSON.stringify(payload) });
export const updateDevice = (id, payload) => apiRequest(`${managementPath}/${id}`, { method: "PUT", body: JSON.stringify(payload) });
export const deactivateDevice = id => apiRequest(`${managementPath}/${id}/deactivate`, { method: "POST" });
export const reactivateDevice = id => apiRequest(`${managementPath}/${id}/reactivate`, { method: "POST" });
export const removeDevice = id => apiRequest(`${managementPath}/${id}`, { method: "DELETE" });
export const getDeviceHistory = id => apiRequest(`${managementPath}/${id}/history`);

export const getDeviceConfiguration = id => apiRequest(`${managementPath}/${id}/configuration`);
export const updateDeviceConfiguration = (id, payload) => apiRequest(`${managementPath}/${id}/configuration`, { method: "PUT", body: JSON.stringify(payload) });
export const getDeviceConfigurationHistory = id => apiRequest(`${managementPath}/${id}/configuration/history`);
export const restoreDeviceConfiguration = (id, version) => apiRequest(`${managementPath}/${id}/configuration/restore/${version}`, { method: "POST" });
export const getDeviceConfigurationTemplates = () => apiRequest(`${managementPath}/configuration-templates`);
export const createDeviceConfigurationTemplate = payload => apiRequest(`${managementPath}/configuration-templates`, { method: "POST", body: JSON.stringify(payload) });
export const updateDeviceConfigurationTemplate = (id, payload) => apiRequest(`${managementPath}/configuration-templates/${id}`, { method: "PUT", body: JSON.stringify(payload) });
export const applyDeviceConfigurationTemplate = (id, templateId) => apiRequest(`${managementPath}/${id}/configuration/template/${templateId}`, { method: "POST" });

export async function getDevicesByIds(deviceIds = []) {
  const devices = await getDevices();
  const deviceMap = new Map(
    (Array.isArray(devices) ? devices : []).map(device => [device.id, device])
  );

  return deviceIds.map(deviceId => ({
    deviceId,
    device: deviceMap.get(deviceId) || null
  }));
}
