import { apiRequest } from "./apiClient";

export async function getDevices() {
  return apiRequest("/api/v1/devices");
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
