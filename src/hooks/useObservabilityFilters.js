import { useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { OBSERVABILITY_FILTER_DEFAULTS } from "../config/observabilityFilterConfig";
import {
  areObservabilityFiltersEqual,
  clearObservabilityFilters,
  countActiveObservabilityFilters,
  parseObservabilityFilters,
  removeObservabilityFilter,
  serializeObservabilityFilters
} from "../utils/observabilityFilterParams";

function buildNextSearch(currentSearch, filters, options = {}, replace = false) {
  const current = new URLSearchParams(currentSearch || "");
  const next = serializeObservabilityFilters(filters, options);
  const keysToRemove = ["q", "service", "device", "metric", "serviceStatus", "deviceStatus", "from", "to", "sort"];

  keysToRemove.forEach(key => current.delete(key));
  next.forEach((value, key) => {
    current.append(key, value);
  });

  const search = current.toString();
  return {
    search: search ? `?${search}` : "",
    replace
  };
}

export function useObservabilityFilters(options = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const defaultSortDirection = options.defaultSortDirection || OBSERVABILITY_FILTER_DEFAULTS.sortDirection;

  const filters = useMemo(
    () => parseObservabilityFilters(location.search, { defaultSortDirection }),
    [defaultSortDirection, location.search]
  );

  const updateFilters = useCallback((nextFilters, navigationOptions = {}) => {
    const next = buildNextSearch(location.search, nextFilters, { defaultSortDirection }, Boolean(navigationOptions.replace));
    navigate(
      { pathname: location.pathname, search: next.search },
      { replace: next.replace }
    );
  }, [defaultSortDirection, location.pathname, location.search, navigate]);

  const setSearch = useCallback((value, navigationOptions = {}) => {
    updateFilters(
      {
        ...filters,
        search: value
      },
      {
        replace: navigationOptions.replace !== false
      }
    );
  }, [filters, updateFilters]);

  const setServiceId = useCallback((value, navigationOptions = {}) => {
    updateFilters(
      {
        ...filters,
        serviceId: value
      },
      navigationOptions
    );
  }, [filters, updateFilters]);

  const setDeviceId = useCallback((value, navigationOptions = {}) => {
    updateFilters(
      {
        ...filters,
        deviceId: value
      },
      navigationOptions
    );
  }, [filters, updateFilters]);

  const setMetricTypes = useCallback((values, navigationOptions = {}) => {
    updateFilters(
      {
        ...filters,
        metricTypes: values
      },
      navigationOptions
    );
  }, [filters, updateFilters]);

  const setServiceHealthStatuses = useCallback((values, navigationOptions = {}) => {
    updateFilters(
      {
        ...filters,
        serviceHealthStatuses: values
      },
      navigationOptions
    );
  }, [filters, updateFilters]);

  const setDeviceHealthStatuses = useCallback((values, navigationOptions = {}) => {
    updateFilters(
      {
        ...filters,
        deviceHealthStatuses: values
      },
      navigationOptions
    );
  }, [filters, updateFilters]);

  const setDateRange = useCallback((from, to, navigationOptions = {}) => {
    updateFilters(
      {
        ...filters,
        from,
        to
      },
      navigationOptions
    );
  }, [filters, updateFilters]);

  const setSortDirection = useCallback((value, navigationOptions = {}) => {
    updateFilters(
      {
        ...filters,
        sortDirection: value
      },
      navigationOptions
    );
  }, [filters, updateFilters]);

  const removeFilter = useCallback((key, navigationOptions = {}) => {
    updateFilters(
      removeObservabilityFilter(filters, key, { defaultSortDirection }),
      navigationOptions
    );
  }, [defaultSortDirection, filters, updateFilters]);

  const clearFilters = useCallback((navigationOptions = {}) => {
    updateFilters(
      clearObservabilityFilters({ defaultSortDirection }),
      navigationOptions
    );
  }, [defaultSortDirection, updateFilters]);

  return {
    filters,
    setSearch,
    setServiceId,
    setDeviceId,
    setMetricTypes,
    setServiceHealthStatuses,
    setDeviceHealthStatuses,
    setDateRange,
    setSortDirection,
    removeFilter,
    clearFilters,
    hasActiveFilters: countActiveObservabilityFilters(filters, { defaultSortDirection }) > 0,
    activeFilterCount: countActiveObservabilityFilters(filters, { defaultSortDirection }),
    filtersEqual: (other) => areObservabilityFiltersEqual(filters, other, { defaultSortDirection })
  };
}

