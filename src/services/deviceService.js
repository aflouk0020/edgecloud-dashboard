import { apiRequest } from "./apiClient";

export async function getDevices() {
  return apiRequest("/api/v1/devices");
}

export async function getDeviceInventory({ search = "", page = 0, size = 20, sort = "name", direction = "asc" } = {}) {
  const params = new URLSearchParams({ search, page, size, sort, direction });
  return apiRequest(`/api/v1/devices/inventory?${params.toString()}`);
}

const managementPath = "/api/v1/devices/management";
export const registerDevice = payload => apiRequest(managementPath, { method: "POST", body: JSON.stringify(payload) });
export const updateDevice = (id, payload) => apiRequest(`${managementPath}/${id}`, { method: "PUT", body: JSON.stringify(payload) });
export const deactivateDevice = id => apiRequest(`${managementPath}/${id}/deactivate`, { method: "POST" });
export const reactivateDevice = id => apiRequest(`${managementPath}/${id}/reactivate`, { method: "POST" });
export const removeDevice = id => apiRequest(`${managementPath}/${id}`, { method: "DELETE" });
export const getDeviceHistory = id => apiRequest(`${managementPath}/${id}/history`);

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
