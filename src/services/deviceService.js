import { apiRequest } from "./apiClient";

export async function getDevices() {
  return apiRequest("/api/v1/devices");
}

export async function getDeviceInventory({ search = "", page = 0, size = 20, sort = "name", direction = "asc" } = {}) {
  const params = new URLSearchParams({ search, page, size, sort, direction });
  return apiRequest(`/api/v1/devices/inventory?${params.toString()}`);
}

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
