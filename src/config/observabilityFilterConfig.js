export const OBSERVABILITY_STATUS_OPTIONS = Object.freeze({
  SERVICE: ["HEALTHY", "DEGRADED", "UNAVAILABLE", "UNKNOWN"],
  DEVICE: ["HEALTHY", "DEGRADED", "OFFLINE", "UNAVAILABLE", "UNKNOWN"]
});

export const OBSERVABILITY_FILTER_DEFAULTS = Object.freeze({
  search: "",
  serviceId: null,
  deviceId: null,
  metricTypes: [],
  serviceHealthStatuses: [],
  deviceHealthStatuses: [],
  from: null,
  to: null,
  sortDirection: "DESC"
});

export const OBSERVABILITY_FILTER_LIMITS = Object.freeze({
  searchMaxLength: 100,
  debounceDelayMs: 300
});

