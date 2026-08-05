import React from "react";

import useDebouncedValue from "../../hooks/useDebouncedValue";
import { OBSERVABILITY_FILTER_LIMITS } from "../../config/observabilityFilterConfig";

function OptionSelect({
  id,
  label,
  value,
  options,
  onChange,
  multiple = false
}) {
  return (
    <label className="observability-filter-field" htmlFor={id}>
      <span>{label}</span>
      <select
        id={id}
        value={value}
        multiple={multiple}
        onChange={onChange}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function extractSelectValues(event) {
  return Array.from(event.target.selectedOptions || []).map(option => option.value);
}

export default function ObservabilityFilterPanel({
  title = "Refine observability data",
  searchEnabled = false,
  searchPlaceholder = "Search",
  searchValue = "",
  onSearchChange,
  serviceId = "",
  serviceOptions = [],
  onServiceIdChange,
  deviceId = "",
  deviceOptions = [],
  onDeviceIdChange,
  metricTypes = [],
  metricTypeOptions = [],
  onMetricTypesChange,
  serviceHealthStatuses = [],
  serviceHealthStatusOptions = [],
  onServiceHealthStatusesChange,
  deviceHealthStatuses = [],
  deviceHealthStatusOptions = [],
  onDeviceHealthStatusesChange,
  from = "",
  to = "",
  dateRangeEnabled = false,
  onDateRangeChange,
  sortDirection = "",
  sortOptions = [],
  onSortDirectionChange,
  activeFilterCount = 0,
  hasActiveFilters = false,
  onClearFilters,
  compact = true
}) {
  const [draftSearch, setDraftSearch] = React.useState(searchValue);
  const debouncedSearch = useDebouncedValue(draftSearch, OBSERVABILITY_FILTER_LIMITS.debounceDelayMs);
  const suppressNextSearchEmitRef = React.useRef(false);
  const lastSyncedSearchRef = React.useRef(searchValue);

  React.useLayoutEffect(() => {
    if (searchValue !== lastSyncedSearchRef.current) {
      suppressNextSearchEmitRef.current = true;
    }

    setDraftSearch(searchValue);
    lastSyncedSearchRef.current = searchValue;
  }, [searchValue]);

  React.useEffect(() => {
    if (!onSearchChange || debouncedSearch === searchValue) {
      return;
    }

    if (suppressNextSearchEmitRef.current) {
      suppressNextSearchEmitRef.current = false;
      return;
    }

    onSearchChange(debouncedSearch);
    lastSyncedSearchRef.current = debouncedSearch;
  }, [debouncedSearch, onSearchChange, searchValue]);

  const handleClear = () => {
    suppressNextSearchEmitRef.current = true;
    lastSyncedSearchRef.current = "";
    setDraftSearch("");
    onSearchChange?.("");
    onClearFilters?.();
  };

  const handleMultiSelectChange = (handler) => (event) => {
    handler?.(extractSelectValues(event));
  };

  return (
    <section className={`observability-filter-panel${compact ? " compact" : ""}`}>
      <details open className="observability-filter-panel__details">
        <summary className="observability-filter-panel__summary">
          <div>
            <p className="observability-filter-eyebrow">Search &amp; Filter</p>
            <h3>{title}</h3>
          </div>

          <div className="observability-filter-panel__meta" aria-live="polite">
            <strong>{activeFilterCount}</strong>
            <span>{activeFilterCount === 1 ? "active filter" : "active filters"}</span>
          </div>
        </summary>

        <div className="observability-filter-panel__body">
          {searchEnabled ? (
            <label className="observability-filter-field observability-search-field" htmlFor="observability-search">
              <span>Search</span>
              <div className="observability-search-input">
                <span aria-hidden="true">⌕</span>
                <input
                  key={searchValue}
                  id="observability-search"
                  type="search"
                  value={draftSearch}
                  maxLength={OBSERVABILITY_FILTER_LIMITS.searchMaxLength}
                  placeholder={searchPlaceholder}
                  onChange={event => setDraftSearch(event.target.value)}
                />
              </div>
            </label>
          ) : null}

          {serviceOptions.length > 0 ? (
            <OptionSelect
              id="observability-service-id"
              label="Service"
              value={serviceId}
              options={serviceOptions}
              onChange={event => onServiceIdChange?.(event.target.value)}
            />
          ) : null}

          {deviceOptions.length > 0 ? (
            <OptionSelect
              id="observability-device-id"
              label="Device"
              value={deviceId}
              options={deviceOptions}
              onChange={event => onDeviceIdChange?.(event.target.value)}
            />
          ) : null}

          {metricTypeOptions.length > 0 ? (
            <OptionSelect
              id="observability-metric-types"
              label="Metric types"
              value={metricTypes}
              options={metricTypeOptions}
              multiple
              onChange={handleMultiSelectChange(onMetricTypesChange)}
            />
          ) : null}

          {serviceHealthStatusOptions.length > 0 ? (
            <OptionSelect
              id="observability-service-statuses"
              label="Service health"
              value={serviceHealthStatuses}
              options={serviceHealthStatusOptions}
              multiple
              onChange={handleMultiSelectChange(onServiceHealthStatusesChange)}
            />
          ) : null}

          {deviceHealthStatusOptions.length > 0 ? (
            <OptionSelect
              id="observability-device-statuses"
              label="Device health"
              value={deviceHealthStatuses}
              options={deviceHealthStatusOptions}
              multiple
              onChange={handleMultiSelectChange(onDeviceHealthStatusesChange)}
            />
          ) : null}

          {dateRangeEnabled ? (
            <div className="observability-filter-date-grid">
              <label className="observability-filter-field" htmlFor="observability-from">
                <span>From</span>
                <input
                  id="observability-from"
                  type="datetime-local"
                  value={from}
                  onChange={event => onDateRangeChange?.(event.target.value, to)}
                />
              </label>

              <label className="observability-filter-field" htmlFor="observability-to">
                <span>To</span>
                <input
                  id="observability-to"
                  type="datetime-local"
                  value={to}
                  onChange={event => onDateRangeChange?.(from, event.target.value)}
                />
              </label>
            </div>
          ) : null}

          {sortOptions.length > 0 ? (
            <OptionSelect
              id="observability-sort"
              label="Sort"
              value={sortDirection}
              options={sortOptions}
              onChange={event => onSortDirectionChange?.(event.target.value)}
            />
          ) : null}

          <div className="observability-filter-panel__actions">
            <button
              type="button"
              className="observability-filter-clear"
              onClick={handleClear}
              disabled={!hasActiveFilters}
            >
              Clear filters
            </button>
          </div>
        </div>
      </details>
    </section>
  );
}
