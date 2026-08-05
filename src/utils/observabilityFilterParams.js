import { OBSERVABILITY_FILTER_DEFAULTS, OBSERVABILITY_STATUS_OPTIONS } from "../config/observabilityFilterConfig";

const FILTER_PARAM_KEYS = [
  "q",
  "service",
  "device",
  "metric",
  "serviceStatus",
  "deviceStatus",
  "from",
  "to",
  "sort"
];

const SORT_VALUES = ["ASC", "DESC"];

function normalizeSearchText(value) {
  return String(value ?? "")
    .trim()
    .slice(0, 100);
}

function normalizeScalar(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed.length === 0 ? null : trimmed;
}

function normalizeSortDirection(value, fallback = OBSERVABILITY_FILTER_DEFAULTS.sortDirection) {
  const normalized = String(value ?? "").trim().toUpperCase();
  return SORT_VALUES.includes(normalized) ? normalized : fallback;
}

function normalizeStatusList(values, allowedValues) {
  const unique = new Set();

  for (const value of values || []) {
    const normalized = String(value ?? "").trim().toUpperCase();
    if (allowedValues.includes(normalized)) {
      unique.add(normalized);
    }
  }

  return [...unique].sort((left, right) => left.localeCompare(right));
}

function normalizeMetricTypeList(values) {
  const unique = new Set();

  for (const value of values || []) {
    const normalized = String(value ?? "").trim();
    if (!normalized) {
      continue;
    }

    if (normalized.length > 100) {
      continue;
    }

    unique.add(normalized);
  }

  return [...unique].sort((left, right) => left.localeCompare(right));
}

function normalizeDateValue(value) {
  const normalized = normalizeScalar(value);
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : normalized;
}

export function createDefaultObservabilityFilters(options = {}) {
  return {
    ...OBSERVABILITY_FILTER_DEFAULTS,
    sortDirection: normalizeSortDirection(
      options.sortDirection,
      OBSERVABILITY_FILTER_DEFAULTS.sortDirection
    )
  };
}

export function parseObservabilityFilters(searchParams, options = {}) {
  const params = searchParams instanceof URLSearchParams
    ? searchParams
    : new URLSearchParams(searchParams || "");

  const allowedServiceStatuses = OBSERVABILITY_STATUS_OPTIONS.SERVICE;
  const allowedDeviceStatuses = OBSERVABILITY_STATUS_OPTIONS.DEVICE;
  const defaultSort = normalizeSortDirection(
    options.defaultSortDirection,
    OBSERVABILITY_FILTER_DEFAULTS.sortDirection
  );

  const filters = {
    search: normalizeSearchText(params.get("q")),
    serviceId: normalizeScalar(params.get("service")),
    deviceId: normalizeScalar(params.get("device")),
    metricTypes: normalizeMetricTypeList(params.getAll("metric")),
    serviceHealthStatuses: normalizeStatusList(params.getAll("serviceStatus"), allowedServiceStatuses),
    deviceHealthStatuses: normalizeStatusList(params.getAll("deviceStatus"), allowedDeviceStatuses),
    from: normalizeDateValue(params.get("from")),
    to: normalizeDateValue(params.get("to")),
    sortDirection: normalizeSortDirection(params.get("sort"), defaultSort)
  };

  return filters;
}

export function serializeObservabilityFilters(filters, options = {}) {
  const defaults = createDefaultObservabilityFilters(options);
  const params = new URLSearchParams();
  const normalized = {
    ...defaults,
    ...filters,
    search: normalizeSearchText(filters?.search),
    serviceId: normalizeScalar(filters?.serviceId),
    deviceId: normalizeScalar(filters?.deviceId),
    metricTypes: normalizeMetricTypeList(filters?.metricTypes),
    serviceHealthStatuses: normalizeStatusList(
      filters?.serviceHealthStatuses,
      OBSERVABILITY_STATUS_OPTIONS.SERVICE
    ),
    deviceHealthStatuses: normalizeStatusList(
      filters?.deviceHealthStatuses,
      OBSERVABILITY_STATUS_OPTIONS.DEVICE
    ),
    from: normalizeDateValue(filters?.from),
    to: normalizeDateValue(filters?.to),
    sortDirection: normalizeSortDirection(filters?.sortDirection, defaults.sortDirection)
  };

  if (normalized.search) {
    params.set("q", normalized.search);
  }
  if (normalized.serviceId) {
    params.set("service", normalized.serviceId);
  }
  if (normalized.deviceId) {
    params.set("device", normalized.deviceId);
  }
  normalized.metricTypes.forEach(value => params.append("metric", value));
  normalized.serviceHealthStatuses.forEach(value => params.append("serviceStatus", value));
  normalized.deviceHealthStatuses.forEach(value => params.append("deviceStatus", value));
  if (normalized.from) {
    params.set("from", normalized.from);
  }
  if (normalized.to) {
    params.set("to", normalized.to);
  }
  if (normalized.sortDirection !== defaults.sortDirection) {
    params.set("sort", normalized.sortDirection);
  }

  return params;
}

export function areObservabilityFiltersEqual(left, right, options = {}) {
  return serializeObservabilityFilters(left, options).toString() === serializeObservabilityFilters(right, options).toString();
}

export function hasActiveObservabilityFilters(filters, options = {}) {
  return countActiveObservabilityFilters(filters, options) > 0;
}

export function countActiveObservabilityFilters(filters, options = {}) {
  const defaults = createDefaultObservabilityFilters(options);
  const current = {
    ...defaults,
    ...filters,
    search: normalizeSearchText(filters?.search),
    serviceId: normalizeScalar(filters?.serviceId),
    deviceId: normalizeScalar(filters?.deviceId),
    metricTypes: normalizeMetricTypeList(filters?.metricTypes),
    serviceHealthStatuses: normalizeStatusList(
      filters?.serviceHealthStatuses,
      OBSERVABILITY_STATUS_OPTIONS.SERVICE
    ),
    deviceHealthStatuses: normalizeStatusList(
      filters?.deviceHealthStatuses,
      OBSERVABILITY_STATUS_OPTIONS.DEVICE
    ),
    from: normalizeDateValue(filters?.from),
    to: normalizeDateValue(filters?.to),
    sortDirection: normalizeSortDirection(filters?.sortDirection, defaults.sortDirection)
  };

  let count = 0;
  if (current.search) count += 1;
  if (current.serviceId) count += 1;
  if (current.deviceId) count += 1;
  count += current.metricTypes.length;
  count += current.serviceHealthStatuses.length;
  count += current.deviceHealthStatuses.length;
  if (current.from) count += 1;
  if (current.to) count += 1;
  if (current.sortDirection !== defaults.sortDirection) count += 1;
  return count;
}

export function clearObservabilityFilters(options = {}) {
  return createDefaultObservabilityFilters(options);
}

export function removeObservabilityFilter(filters, key, options = {}) {
  const defaults = createDefaultObservabilityFilters(options);
  const next = { ...defaults, ...filters };

  switch (key) {
    case "search":
      next.search = defaults.search;
      break;
    case "serviceId":
      next.serviceId = defaults.serviceId;
      break;
    case "deviceId":
      next.deviceId = defaults.deviceId;
      break;
    case "metricTypes":
      next.metricTypes = defaults.metricTypes;
      break;
    case "serviceHealthStatuses":
      next.serviceHealthStatuses = defaults.serviceHealthStatuses;
      break;
    case "deviceHealthStatuses":
      next.deviceHealthStatuses = defaults.deviceHealthStatuses;
      break;
    case "from":
      next.from = defaults.from;
      break;
    case "to":
      next.to = defaults.to;
      break;
    case "sortDirection":
      next.sortDirection = defaults.sortDirection;
      break;
    default:
      break;
  }

  return next;
}

export {
  normalizeSearchText,
  normalizeScalar,
  normalizeSortDirection,
  normalizeStatusList,
  normalizeMetricTypeList
};

