import { apiRequest } from "./apiClient";

function buildDateQuery(from, to) {
  const params = new URLSearchParams();

  if (from) {
    params.set("from", from);
  }

  if (to) {
    params.set("to", to);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export function getServiceAggregation(serviceId, { from, to } = {}) {
  return apiRequest(
    `/api/v1/aggregation/services/${serviceId}${buildDateQuery(from, to)}`
  );
}

export function getDeviceAggregation(deviceId, { from, to } = {}) {
  return apiRequest(
    `/api/v1/aggregation/devices/${deviceId}${buildDateQuery(from, to)}`
  );
}
