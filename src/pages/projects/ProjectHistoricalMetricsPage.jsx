import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import DashboardLayout from "../../components/layout/DashboardLayout";
import { CONNECTION_STATE, useObservabilityPolling } from "../../hooks/useObservabilityPolling";
import ObservabilityConnectionStatus from "../../components/observability/ObservabilityConnectionStatus";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import LoadingState from "../../components/ui/LoadingState";
import PageHero from "../../components/ui/PageHero";
import StatusBadge from "../../components/ui/StatusBadge";
import ProjectContextNav from "../../components/projects/ProjectContextNav";
import ObservabilityFilterChips from "../../components/observability/ObservabilityFilterChips";
import ObservabilityFilterPanel from "../../components/observability/ObservabilityFilterPanel";
import { observabilityRefreshConfig } from "../../config/observabilityRefreshConfig";
import { useObservabilityFilters } from "../../hooks/useObservabilityFilters";
import { getProjectWorkspace, normalizeWorkspaceError } from "../../services/projectWorkspaceService";
import {
  getProjectHistoricalMetrics,
  normalizeProjectHistoricalMetricsError
} from "../../services/projectHistoricalMetricsService";
import {
  exportProjectMetrics,
  normalizeProjectMetricsExportError
} from "../../services/projectMetricsExportService";
import { normalizeSearchText } from "../../utils/observabilityFilterParams";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_RANGE_HOURS = 24;
const MAX_RANGE_DAYS = 90;

function formatDateTimeInputValue(date) {
  const pad = value => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join("-") + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoDateTime(value) {
  return new Date(value).toISOString();
}

function createDefaultRange() {
  const to = new Date();
  const from = new Date(to.getTime() - DEFAULT_RANGE_HOURS * 60 * 60 * 1000);
  return {
    from: formatDateTimeInputValue(from),
    to: formatDateTimeInputValue(to)
  };
}

function validateRange(from, to) {
  if (!from || !to) {
    return "Please select both a From and To date/time.";
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return "Please enter a valid ISO-compatible date/time.";
  }

  if (fromDate > toDate) {
    return "From must be earlier than or equal to To.";
  }

  const rangeDays = (toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000);
  if (rangeDays > MAX_RANGE_DAYS) {
    return "The selected range must not exceed 90 days.";
  }

  return "";
}

function getDisplayValue(record, key, fallback = "Unavailable") {
  const value = record?.[key];
  return value === null || value === undefined || value === "" ? fallback : value;
}

function normalizeInputValue(value) {
  return value === "" ? null : value;
}

function matchesSearch(search, values) {
  const query = normalizeSearchText(search).toLowerCase();

  if (!query) {
    return true;
  }

  return values.some(value => String(value ?? "").toLowerCase().includes(query));
}

function buildOptionList(ids = [], allLabel) {
  return [
    { value: "", label: allLabel },
    ...ids.map(id => ({ value: id, label: id }))
  ];
}

function buildMetricTypeOptions(records = [], selectedMetricTypes = []) {
  const metricTypes = new Set();

  records.forEach(record => {
    if (record?.metricType) {
      metricTypes.add(record.metricType);
    }
  });

  selectedMetricTypes.forEach(metricType => {
    if (metricType) {
      metricTypes.add(metricType);
    }
  });

  return [...metricTypes]
    .sort((left, right) => left.localeCompare(right))
    .map(value => ({ value, label: value }));
}

function MetricsList({ records, sortDirection }) {
  if (!records.length) {
    return null;
  }

  return (
    <ol className={`project-metrics-timeline ${sortDirection === "ASC" ? "ascending" : "descending"}`}>
      {records.map(record => (
        <li key={record.recordId} className={`project-metrics-item ${record.partial ? "partial" : ""}`}>
          <div className="project-metrics-item-marker" aria-hidden="true" />
          <article className="project-metrics-item-card">
            <header className="project-metrics-item-header">
              <div>
                <strong>{getDisplayValue(record, "metricType")}</strong>
                <span>{getDisplayValue(record, "sourceType")} · {getDisplayValue(record, "sourceId")}</span>
              </div>
              <time dateTime={record.recordedAt || undefined}>
                {record.recordedAt ? new Date(record.recordedAt).toLocaleString("en-IE") : "Unavailable"}
              </time>
            </header>

            <div className="project-metrics-item-grid">
              <div>
                <span>Value</span>
                <strong>{record.numericValue ?? "Unavailable"}</strong>
              </div>
              <div>
                <span>Unit</span>
                <strong>{getDisplayValue(record, "unit")}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{getDisplayValue(record, "status")}</strong>
              </div>
              <div>
                <span>Source ID</span>
                <strong>{getDisplayValue(record, "sourceId")}</strong>
              </div>
            </div>

            <div className="project-metrics-item-details">
              <span>Recorded: {record.recordedAt ? new Date(record.recordedAt).toLocaleString("en-IE") : "Unavailable"}</span>
              {record.partial ? <StatusBadge variant="unknown">PARTIAL</StatusBadge> : null}
            </div>
          </article>
        </li>
      ))}
    </ol>
  );
}

export default function ProjectHistoricalMetricsPage() {
  const { projectId } = useParams();
  const defaultRange = useMemo(() => createDefaultRange(), []);
  const [workspace, setWorkspace] = useState(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [workspaceError, setWorkspaceError] = useState(null);
  const [history, setHistory] = useState(null);
  const [historyError, setHistoryError] = useState(null);
  const [validationError, setValidationError] = useState("");
  const [exportState, setExportState] = useState({
    loading: false,
    notice: null,
    error: null
  });
  const [pagination, setPagination] = useState({
    page: 0,
    size: 25
  });
  const {
    filters,
    setSearch,
    setServiceId,
    setDeviceId,
    setMetricTypes,
    setDateRange,
    setSortDirection,
    removeFilter,
    clearFilters,
    hasActiveFilters,
    activeFilterCount
  } = useObservabilityFilters({ defaultSortDirection: "DESC" });

  useEffect(() => {
    let active = true;
    setWorkspaceLoading(true);
    setWorkspaceError(null);
    setWorkspace(null);

    getProjectWorkspace(projectId)
      .then(result => {
        if (active) {
          setWorkspace(result);
        }
      })
      .catch(error => {
        if (active) {
          setWorkspaceError(normalizeWorkspaceError(error));
        }
      })
      .finally(() => {
        if (active) {
          setWorkspaceLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [projectId]);

  useEffect(() => {
    if (filters.from && filters.to) {
      return;
    }

    setDateRange(defaultRange.from, defaultRange.to, { replace: true });
  }, [defaultRange.from, defaultRange.to, filters.from, filters.to, setDateRange]);

  const selectedFrom = filters.from || defaultRange.from;
  const selectedTo = filters.to || defaultRange.to;

  const selectedRangeMessage = useMemo(() => {
    const fromValue = selectedFrom ? new Date(selectedFrom).toLocaleString("en-IE") : "Unavailable";
    const toValue = selectedTo ? new Date(selectedTo).toLocaleString("en-IE") : "Unavailable";
    return `${fromValue} → ${toValue}`;
  }, [selectedFrom, selectedTo]);

  const rangeError = useMemo(() => validateRange(selectedFrom, selectedTo), [selectedFrom, selectedTo]);

  useEffect(() => {
    setValidationError(rangeError);
  }, [rangeError]);

  const serviceOptions = useMemo(
    () => buildOptionList(workspace?.serviceIds || [], "All services"),
    [workspace?.serviceIds]
  );

  const deviceOptions = useMemo(
    () => buildOptionList(workspace?.deviceIds || [], "All devices"),
    [workspace?.deviceIds]
  );

  const metricTypeOptions = useMemo(
    () => buildMetricTypeOptions(history?.records || [], filters.metricTypes),
    [filters.metricTypes, history?.records]
  );

  const resetPage = useCallback(() => {
    setPagination(current => (
      current.page === 0 ? current : { ...current, page: 0 }
    ));
  }, []);

  const handleSearchChange = useCallback(value => {
    setSearch(value);
  }, [setSearch]);

  const handleServiceChange = useCallback(value => {
    setServiceId(normalizeInputValue(value));
    if (normalizeInputValue(value)) {
      setDeviceId("");
    }
    resetPage();
  }, [resetPage, setDeviceId, setServiceId]);

  const handleDeviceChange = useCallback(value => {
    setDeviceId(normalizeInputValue(value));
    if (normalizeInputValue(value)) {
      setServiceId("");
    }
    resetPage();
  }, [resetPage, setDeviceId, setServiceId]);

  const handleMetricTypesChange = useCallback(values => {
    setMetricTypes(values);
    resetPage();
  }, [resetPage, setMetricTypes]);

  const handleDateRangeChange = useCallback((from, to) => {
    setDateRange(normalizeInputValue(from), normalizeInputValue(to));
    resetPage();
  }, [resetPage, setDateRange]);

  const handleSortDirectionChange = useCallback(value => {
    setSortDirection(value);
    resetPage();
  }, [resetPage, setSortDirection]);

  const handleClearFilters = useCallback(() => {
    clearFilters({ replace: true });
    setDateRange(defaultRange.from, defaultRange.to, { replace: true });
    resetPage();
  }, [clearFilters, defaultRange.from, defaultRange.to, resetPage, setDateRange]);

  const historicalQuery = useMemo(() => ({
    from: toIsoDateTime(selectedFrom),
    to: toIsoDateTime(selectedTo),
    serviceId: filters.serviceId,
    deviceId: filters.deviceId,
    metricTypes: filters.metricTypes,
    page: pagination.page,
    size: pagination.size,
    sortDirection: filters.sortDirection
  }), [
    filters.deviceId,
    filters.serviceId,
    filters.metricTypes,
    filters.sortDirection,
    pagination.page,
    pagination.size,
    selectedFrom,
    selectedTo,
  ]);

  const fetchHistory = useCallback(async () => {
    const response = await getProjectHistoricalMetrics(
      projectId,
      historicalQuery
    );

    setHistory(response);
    setHistoryError(null);
    return response;
  }, [historicalQuery, projectId]);

  const handleExport = useCallback(async () => {
    if (!workspace || rangeError || exportState.loading) {
      return;
    }

    setExportState(current => ({
      ...current,
      loading: true,
      notice: null,
      error: null
    }));

    try {
      const response = await exportProjectMetrics(projectId, {
        from: toIsoDateTime(selectedFrom),
        to: toIsoDateTime(selectedTo),
        serviceId: filters.serviceId,
        deviceId: filters.deviceId,
        metricTypes: filters.metricTypes,
        sortDirection: filters.sortDirection
      });

      const safeFilename = response.filename || "edgecloud-project-metrics.csv";
      const objectUrl = URL.createObjectURL(response.blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = safeFilename;
      anchor.style.display = "none";
      document.body.appendChild(anchor);

      try {
        anchor.click();
      } finally {
        anchor.remove();
        URL.revokeObjectURL(objectUrl);
      }

      setExportState({
        loading: false,
        notice: {
          title: "Export started",
          message: `CSV download started for ${safeFilename}.`
        },
        error: null
      });
    } catch (error) {
      setExportState({
        loading: false,
        notice: null,
        error: normalizeProjectMetricsExportError(error)
      });
    }
  }, [
    exportState.loading,
    filters.deviceId,
    filters.metricTypes,
    filters.serviceId,
    filters.sortDirection,
    projectId,
    rangeError,
    selectedFrom,
    selectedTo,
    workspace
  ]);

  const pollingEnabled = Boolean(workspace && !rangeError);
  const {
    connectionState,
    lastSuccessfulRefreshAt,
    refresh: refreshNow
  } = useObservabilityPolling(fetchHistory, {
    enabled: pollingEnabled,
    immediate: false,
    intervalMs: observabilityRefreshConfig.historicalRefreshIntervalMs,
    autoRefreshEnabled: pagination.page === 0
  });

  useEffect(() => {
    if (!workspace || rangeError) {
      return undefined;
    }

    void refreshNow().catch(error => {
      setHistoryError(normalizeProjectHistoricalMetricsError(error));
    });

    return undefined;
  }, [
    filters.deviceId,
    filters.metricTypes,
    filters.serviceId,
    filters.sortDirection,
    rangeError,
    pagination.page,
    pagination.size,
    refreshNow,
    selectedFrom,
    selectedTo,
    workspace
  ]);

  const isRefreshing = connectionState === CONNECTION_STATE.REFRESHING && Boolean(history);
  const showInitialLoading = connectionState === CONNECTION_STATE.REFRESHING && !history;
  const connectionWarning = connectionState === CONNECTION_STATE.REFRESHING
    ? "Refreshing historical metrics in the background. Existing data remains visible."
    : connectionState === CONNECTION_STATE.DEGRADED
      ? "Connection degraded. A refresh failed, but the last successful historical data remains visible."
      : connectionState === CONNECTION_STATE.DISCONNECTED
        ? "Automatic historical polling is paused until the connection recovers."
        : "";

  const dataState = history?.dataState || "NO_DATA";
  const pageInfo = history?.pagination || {
    currentPage: pagination.page,
    pageSize: pagination.size,
    totalElements: 0,
    totalPages: 0,
    sortDirection: filters.sortDirection
  };
  const records = history?.records || [];
  const isEmpty = dataState === "NO_DATA" || records.length === 0;
  const isUnavailable = dataState === "UNAVAILABLE";
  const isPartial = dataState === "PARTIAL";
  const filteredRecords = useMemo(() => {
    const query = normalizeSearchText(filters.search).toLowerCase();

    if (!query) {
      return records;
    }

    return records.filter(record => matchesSearch(query, [
      record.recordId,
      record.metricType,
      record.sourceType,
      record.sourceId,
      record.unit,
      record.status,
      record.recordedAt,
      record.numericValue
    ]));
  }, [filters.search, records]);
  const isFilteredEmpty = !isEmpty && filteredRecords.length === 0;

  const historicalFilterChips = useMemo(() => {
    const chips = [];

    if (filters.search) {
      chips.push({
        id: "search",
        label: "Search",
        value: filters.search,
        onRemove: () => handleSearchChange("")
      });
    }

    if (filters.serviceId) {
      chips.push({
        id: "service",
        label: "Service",
        value: filters.serviceId,
        onRemove: () => handleServiceChange("")
      });
    }

    if (filters.deviceId) {
      chips.push({
        id: "device",
        label: "Device",
        value: filters.deviceId,
        onRemove: () => handleDeviceChange("")
      });
    }

    filters.metricTypes.forEach(metricType => {
      chips.push({
        id: `metric-${metricType}`,
        label: "Metric type",
        value: metricType,
        onRemove: () => handleMetricTypesChange(filters.metricTypes.filter(value => value !== metricType))
      });
    });

    if (selectedFrom) {
      chips.push({
        id: "from",
        label: "From",
        value: new Date(selectedFrom).toLocaleString("en-IE"),
        onRemove: () => handleDateRangeChange("", selectedTo)
      });
    }

    if (selectedTo) {
      chips.push({
        id: "to",
        label: "To",
        value: new Date(selectedTo).toLocaleString("en-IE"),
        onRemove: () => handleDateRangeChange(selectedFrom, "")
      });
    }

    if (filters.sortDirection !== "DESC") {
      chips.push({
        id: "sort",
        label: "Sort",
        value: filters.sortDirection,
        onRemove: () => handleSortDirectionChange("DESC")
      });
    }

    return chips;
  }, [
    filters.deviceId,
    filters.metricTypes,
    filters.search,
    filters.serviceId,
    filters.sortDirection,
    handleDateRangeChange,
    handleDeviceChange,
    handleMetricTypesChange,
    handleSearchChange,
    handleServiceChange,
    handleSortDirectionChange,
    selectedFrom,
    selectedTo
  ]);

  if (workspaceLoading) {
    return (
      <DashboardLayout>
        <section className="project-metrics-page">
          <LoadingState message="Loading project workspace..." />
        </section>
      </DashboardLayout>
    );
  }

  if (workspaceError) {
    return (
      <DashboardLayout>
        <section className="project-metrics-page">
          <ErrorState title={workspaceError.title} message={workspaceError.message} />
        </section>
      </DashboardLayout>
    );
  }

  if (!workspace) {
    return (
      <DashboardLayout>
        <section className="project-metrics-page">
          <EmptyState
            title="Empty workspace"
            message="This project does not yet have enough context to show historical metrics."
          />
        </section>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <section className="project-metrics-page">
        <PageHero
          eyebrow="Project History"
          title={workspace.projectName}
          description={workspace.projectDescription || "No project description provided."}
          action={<StatusBadge variant={workspace.projectStatus}>{workspace.projectStatus}</StatusBadge>}
        />

        <ProjectContextNav active="metrics" />

        <div className="project-metrics-context-grid">
          <article className="project-metrics-context-card">
            <span>Project context</span>
            <strong>{workspace.projectName}</strong>
            <p>{workspace.callerProjectRole} · {workspace.projectStatus}</p>
          </article>
          <article className="project-metrics-context-card">
            <span>Date range</span>
            <strong>{selectedRangeMessage}</strong>
            <p>Maximum range: 90 days</p>
          </article>
          <article className="project-metrics-context-card">
            <span>Pagination</span>
            <strong>Page {pagination.currentPage + 1} of {Math.max(pagination.totalPages || 1, 1)}</strong>
            <p>{pagination.totalElements} total records</p>
          </article>
        </div>

        <ObservabilityFilterPanel
          title="Refine historical metrics"
          searchEnabled
          searchPlaceholder="Search records, IDs, values or status"
          searchValue={filters.search}
          onSearchChange={handleSearchChange}
          serviceId={filters.serviceId || ""}
          serviceOptions={serviceOptions}
          onServiceIdChange={handleServiceChange}
          deviceId={filters.deviceId || ""}
          deviceOptions={deviceOptions}
          onDeviceIdChange={handleDeviceChange}
          metricTypes={filters.metricTypes}
          metricTypeOptions={metricTypeOptions}
          onMetricTypesChange={handleMetricTypesChange}
          from={selectedFrom}
          to={selectedTo}
          dateRangeEnabled
          onDateRangeChange={handleDateRangeChange}
          sortDirection={filters.sortDirection}
          sortOptions={[
            { value: "DESC", label: "Newest first" },
            { value: "ASC", label: "Oldest first" }
          ]}
          onSortDirectionChange={handleSortDirectionChange}
          activeFilterCount={activeFilterCount}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={handleClearFilters}
        />

        <ObservabilityFilterChips
          chips={historicalFilterChips}
          onClearAll={handleClearFilters}
        />

        <section className="project-metrics-controls">
          <div className="project-metrics-control-group">
            <label>
              Page size
              <select
                value={pagination.size}
                onChange={event => setPagination({ page: 0, size: Number(event.target.value) })}
              >
                {PAGE_SIZE_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="button"
            className="project-metrics-refresh-button"
            onClick={() => {
              void refreshNow().catch(error => {
                setHistoryError(normalizeProjectHistoricalMetricsError(error));
              });
            }}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Refreshing..." : "Refresh history"}
          </button>
          <button
            type="button"
            className="project-metrics-export-button"
            onClick={() => {
              void handleExport();
            }}
            disabled={!workspace || Boolean(rangeError) || exportState.loading || workspaceLoading}
          >
            {exportState.loading ? "Exporting..." : "Export CSV"}
          </button>
        </section>

        {validationError ? (
          <ErrorState title="Invalid date range" message={validationError} />
        ) : null}

        {exportState.notice ? (
          <div className="project-metrics-banner export-success" role="status">
            <strong>{exportState.notice.title}</strong>
            <span>{exportState.notice.message}</span>
          </div>
        ) : null}

        {exportState.error ? (
          <div className="project-metrics-banner export-error" role="status">
            <strong>{exportState.error.title}</strong>
            <span>{exportState.error.message}</span>
          </div>
        ) : null}

        {showInitialLoading ? (
          <LoadingState message="Loading historical metrics..." />
        ) : null}

        {isRefreshing ? (
          <div className="project-metrics-background-loading" role="status">
            Updating historical metrics...
          </div>
        ) : null}

        {historyError && !history ? (
          <ErrorState title={historyError.title} message={historyError.message} />
        ) : null}

        {isPartial ? (
          <div className="project-metrics-banner partial" role="status">
            Some historical data could not be resolved. The available records are shown below.
          </div>
        ) : null}

        <ObservabilityConnectionStatus
          status={connectionState}
          lastSuccessfulRefreshAt={lastSuccessfulRefreshAt}
          warning={connectionWarning}
        />

        {isUnavailable ? (
          <div className="project-metrics-banner unavailable" role="status">
            Historical data is temporarily unavailable for this selection.
          </div>
        ) : null}

        {isFilteredEmpty ? (
          <EmptyState
            title="No matching historical records"
            message="Clear filters to view the linked historical metrics for this project."
            action={(
              <button
                type="button"
                className="project-metrics-refresh-button"
                onClick={() => {
                  void refreshNow().catch(error => {
                    setHistoryError(normalizeProjectHistoricalMetricsError(error));
                  });
                }}
              >
                Refresh history
              </button>
            )}
          />
        ) : isEmpty ? (
          <EmptyState
            title="No historical records found"
            message="There are no telemetry records for the selected period."
          />
        ) : (
          <div className="project-metrics-results">
            <div className="project-metrics-results-summary">
              <StatusBadge variant={dataState}>{dataState}</StatusBadge>
              <span>Sorted {pageInfo.sortDirection}</span>
              <span>{pageInfo.totalElements} records</span>
            </div>

            <MetricsList
              records={filteredRecords}
              sortDirection={pageInfo.sortDirection}
            />

            <div className="project-metrics-pagination">
              <button
                type="button"
                onClick={() => setPagination(current => ({ ...current, page: Math.max((current.page || 0) - 1, 0) }))}
                disabled={pageInfo.currentPage <= 0 || isRefreshing}
              >
                Previous
              </button>
              <div>
                <span>Page {pageInfo.currentPage + 1} of {Math.max(pageInfo.totalPages || 1, 1)}</span>
              </div>
              <button
                type="button"
                onClick={() => setPagination(current => ({ ...current, page: (current.page || 0) + 1 }))}
                disabled={pageInfo.currentPage + 1 >= (pageInfo.totalPages || 0) || isRefreshing}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}
