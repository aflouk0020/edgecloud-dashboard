import { apiRequest } from "./apiClient";

export function getMonitoredServices() {
  return apiRequest("/api/v1/monitoring/services");
}

export async function getMonitoredServicesByIds(serviceIds = []) {
  const services = await getMonitoredServices();
  const serviceMap = new Map(
    (Array.isArray(services) ? services : []).map(service => [service.id, service])
  );

  return serviceIds.map(serviceId => ({
    serviceId,
    service: serviceMap.get(serviceId) || null
  }));
}

export function getServiceAvailability(serviceId) {
  return apiRequest(
    `/api/v1/monitoring/services/${serviceId}/availability`
  );
}

export function getServiceDowntimeHistory(serviceId) {
  return apiRequest(
    `/api/v1/monitoring/services/${serviceId}/downtime-history`
  );
}
