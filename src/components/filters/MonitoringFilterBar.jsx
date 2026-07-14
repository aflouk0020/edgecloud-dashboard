import React from "react";

export function FilterSelect({
  id,
  label,
  value,
  onChange,
  options
}) {
  return (
    <label className="monitoring-filter-field" htmlFor={id}>
      <span>{label}</span>
      <select id={id} value={value} onChange={onChange}>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function MonitoringFilterBar({
  searchId,
  searchLabel = "Search",
  searchPlaceholder,
  searchValue,
  onSearchChange,
  resultCount,
  totalCount,
  hasActiveFilters,
  onClear,
  children
}) {
  const filterControls = React.Children.toArray(children);

  return (
    <section className="monitoring-filter-bar" aria-label="Monitoring filters">
      <div className="monitoring-filter-heading">
        <div>
          <p className="monitoring-filter-eyebrow">Search &amp; Filter</p>
          <h3>Refine monitoring data</h3>
        </div>

        <div className="monitoring-filter-results" aria-live="polite">
          <strong>{resultCount}</strong>
          <span>of {totalCount} results</span>
        </div>
      </div>

      <div className="monitoring-filter-controls">
        <label
          className="monitoring-filter-field monitoring-search-field"
          htmlFor={searchId}
        >
          <span>{searchLabel}</span>
          <div className="monitoring-search-input">
            <span aria-hidden="true">⌕</span>
            <input
              id={searchId}
              type="search"
              aria-label={searchLabel}
              value={searchValue}
              placeholder={searchPlaceholder}
              onChange={onSearchChange}
            />
          </div>
        </label>

        {filterControls}

        <button
          className="monitoring-filter-clear"
          type="button"
          disabled={!hasActiveFilters}
          onClick={onClear}
        >
          Clear filters
        </button>
      </div>
    </section>
  );
}
