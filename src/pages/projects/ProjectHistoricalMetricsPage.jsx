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
import { observabilityRefreshConfig } from "../../config/observabilityRefreshConfig";
import { getProjectWorkspace, normalizeWorkspaceError } from "../../services/projectWorkspaceService";
import {
  getProjectHistoricalMetrics,
  normalizeProjectHistoricalMetricsError
} from "../../services/projectHistoricalMetricsService";
import {
  exportProjectMetrics,
  normalizeProjectMetricsExportError
} from "../../services/projectMetricsExportService";

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
  const [filters, setFilters] = useState(() => {
    const defaults = createDefaultRange();
    return {
      from: defaults.from,
      to: defaults.to,
      page: 0,
      size: 25,
      sortDirection: "DESC"
    };
  });

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

  const selectedRangeMessage = useMemo(() => {
    const fromValue = filters.from ? new Date(filters.from).toLocaleString("en-IE") : "Unavailable";
    const toValue = filters.to ? new Date(filters.to).toLocaleString("en-IE") : "Unavailable";
    return `${fromValue} → ${toValue}`;
  }, [filters.from, filters.to]);

  const rangeError = useMemo(() => validateRange(filters.from, filters.to), [filters.from, filters.to]);

  useEffect(() => {
    setValidationError(rangeError);
  }, [rangeError]);

  const fetchHistory = useCallback(async () => {
    const response = await getProjectHistoricalMetrics(
      projectId,
      {
        from: toIsoDateTime(filters.from),
        to: toIsoDateTime(filters.to),
        page: filters.page,
        size: filters.size,
        sortDirection: filters.sortDirection
      }
    );

    setHistory(response);
    setHistoryError(null);
    return response;
  }, [filters.from, filters.page, filters.size, filters.sortDirection, filters.to, projectId]);

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
        from: toIsoDateTime(filters.from),
        to: toIsoDateTime(filters.to),
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
  }, [exportState.loading, filters.from, filters.sortDirection, filters.to, projectId, rangeError, workspace]);

  const pollingEnabled = Boolean(workspace && !rangeError);
  const {
    connectionState,
    lastSuccessfulRefreshAt,
    refresh: refreshNow
  } = useObservabilityPolling(fetchHistory, {
    enabled: pollingEnabled,
    immediate: false,
    intervalMs: observabilityRefreshConfig.historicalRefreshIntervalMs,
    autoRefreshEnabled: filters.page === 0
  });

  useEffect(() => {
    if (!workspace || rangeError) {
      return undefined;
    }

    void refreshNow().catch(error => {
      setHistoryError(normalizeProjectHistoricalMetricsError(error));
    });

    return undefined;
  }, [filters.from, filters.page, filters.size, filters.sortDirection, filters.to, rangeError, refreshNow, workspace]);

  const updateFilters = updates => {
    setFilters(current => ({
      ...current,
      ...updates,
      page: updates.page ?? 0
    }));
  };

  const isRefreshing = connectionState === CONNECTION_STATE.REFRESHING && Boolean(history);
  const showInitialLoading = connectionState === CONNECTION_STATE.REFRESHING && !history;
  const connectionWarning = connectionState === CONNECTION_STATE.REFRESHING
    ? "Refreshing historical metrics in the background. Existing data remains visible."
    : connectionState === CONNECTION_STATE.DEGRADED
      ? "Connection degraded. A refresh failed, but the last successful historical data remains visible."
      : connectionState === CONNECTION_STATE.DISCONNECTED
        ? "Automatic historical polling is paused until the connection recovers."
        : "";

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
  const dataState = history?.dataState || "NO_DATA";
  const pagination = history?.pagination || {
    currentPage: filters.page,
    pageSize: filters.size,
    totalElements: 0,
    totalPages: 0,
    sortDirection: filters.sortDirection
  };
  const records = history?.records || [];
  const isEmpty = dataState === "NO_DATA" || records.length === 0;
  const isUnavailable = dataState === "UNAVAILABLE";
  const isPartial = dataState === "PARTIAL";

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

        <section className="project-metrics-controls">
          <div className="project-metrics-control-group">
            <label>
              From
              <input
                type="datetime-local"
                value={filters.from}
                onChange={event => updateFilters({ from: event.target.value })}
              />
            </label>
            <label>
              To
              <input
                type="datetime-local"
                value={filters.to}
                onChange={event => updateFilters({ to: event.target.value })}
              />
            </label>
            <label>
              Sort
              <select
                value={filters.sortDirection}
                onChange={event => updateFilters({ sortDirection: event.target.value })}
              >
                <option value="DESC">DESC</option>
                <option value="ASC">ASC</option>
              </select>
            </label>
            <label>
              Page size
              <select
                value={filters.size}
                onChange={event => updateFilters({ size: Number(event.target.value) })}
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

        {isEmpty ? (
          <EmptyState
            title="No historical records found"
            message="There are no telemetry records for the selected period."
          />
        ) : (
          <div className="project-metrics-results">
            <div className="project-metrics-results-summary">
              <StatusBadge variant={dataState}>{dataState}</StatusBadge>
              <span>Sorted {pagination.sortDirection}</span>
              <span>{pagination.totalElements} records</span>
            </div>

            <MetricsList
              records={records}
              sortDirection={pagination.sortDirection}
            />

            <div className="project-metrics-pagination">
              <button
                type="button"
                onClick={() => updateFilters({ page: Math.max((pagination.currentPage || 0) - 1, 0) })}
                disabled={pagination.currentPage <= 0 || isRefreshing}
              >
                Previous
              </button>
              <div>
                <span>Page {pagination.currentPage + 1} of {Math.max(pagination.totalPages || 1, 1)}</span>
              </div>
              <button
                type="button"
                onClick={() => updateFilters({ page: (pagination.currentPage || 0) + 1 })}
                disabled={pagination.currentPage + 1 >= (pagination.totalPages || 0) || isRefreshing}
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
