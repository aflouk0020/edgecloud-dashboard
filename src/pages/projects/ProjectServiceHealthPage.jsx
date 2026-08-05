import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import DashboardLayout from "../../components/layout/DashboardLayout";
import { CONNECTION_STATE, useObservabilityPolling } from "../../hooks/useObservabilityPolling";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import LoadingState from "../../components/ui/LoadingState";
import PageHero from "../../components/ui/PageHero";
import StatCard from "../../components/ui/StatCard";
import StatusBadge from "../../components/ui/StatusBadge";
import ObservabilityFilterChips from "../../components/observability/ObservabilityFilterChips";
import ObservabilityFilterPanel from "../../components/observability/ObservabilityFilterPanel";
import ObservabilityConnectionStatus from "../../components/observability/ObservabilityConnectionStatus";
import ProjectContextNav from "../../components/projects/ProjectContextNav";
import { useObservabilityFilters } from "../../hooks/useObservabilityFilters";
import { getProjectWorkspace, normalizeWorkspaceError } from "../../services/projectWorkspaceService";
import {
  getProjectServiceHealth,
  normalizeProjectServiceHealthError
} from "../../services/projectServiceHealthService";
import { OBSERVABILITY_STATUS_OPTIONS } from "../../config/observabilityFilterConfig";
import { normalizeSearchText } from "../../utils/observabilityFilterParams";

function formatDateTime(value) {
  if (!value) {
    return "Unavailable";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unavailable"
    : date.toLocaleString("en-IE");
}

function normalizeText(value, fallback = "Unavailable") {
  return value === null || value === undefined || value === "" ? fallback : value;
}

function matchesSearch(search, values) {
  const query = normalizeSearchText(search).toLowerCase();

  if (!query) {
    return true;
  }

  return values.some(value => String(value ?? "").toLowerCase().includes(query));
}

function mapHealthVariant(value) {
  switch (value) {
    case "HEALTHY":
      return "online";
    case "DEGRADED":
      return "warning";
    case "UNAVAILABLE":
      return "offline";
    default:
      return "unknown";
  }
}

function mapCompletenessVariant(value) {
  switch (value) {
    case "COMPLETE":
      return "online";
    case "PARTIAL":
      return "warning";
    default:
      return "unknown";
  }
}

function sortServices(services = [], sortDirection = "ASC") {
  const normalized = [...services].sort((left, right) => {
    const leftName = String(left?.serviceName || "").toLowerCase();
    const rightName = String(right?.serviceName || "").toLowerCase();

    if (leftName < rightName) {
      return -1;
    }

    if (leftName > rightName) {
      return 1;
    }

    return String(left?.serviceId || "").localeCompare(String(right?.serviceId || ""));
  });

  if (sortDirection === "DESC") {
    return normalized.sort((left, right) => {
      const leftName = String(left?.serviceName || "").toLowerCase();
      const rightName = String(right?.serviceName || "").toLowerCase();

      if (leftName < rightName) {
        return 1;
      }

      if (leftName > rightName) {
        return -1;
      }

      return String(left?.serviceId || "").localeCompare(String(right?.serviceId || ""));
    });
  }

  return normalized;
}

function ServiceCard({ service }) {
  return (
    <article className={`project-service-health-card ${service.dataState === "NO_DATA" ? "unavailable" : ""}`}>
      <header className="project-service-health-card-header">
        <div>
          <strong>{normalizeText(service.serviceName, "Unavailable service")}</strong>
          <span>{normalizeText(service.serviceId)}</span>
        </div>
        <StatusBadge
          variant={mapHealthVariant(service.currentHealthStatus)}
          aria-label={`Current health status ${normalizeText(service.currentHealthStatus, "UNKNOWN")}`}
        >
          {normalizeText(service.currentHealthStatus, "UNKNOWN")}
        </StatusBadge>
      </header>

      <div className="project-service-health-card-grid">
        <div>
          <span>Service URL</span>
          <strong>{normalizeText(service.serviceUrl)}</strong>
        </div>
        <div>
          <span>Availability</span>
          <strong>{service.availabilityPercentage ?? "Unavailable"}</strong>
        </div>
        <div>
          <span>Latest monitoring update</span>
          <strong>{formatDateTime(service.latestMonitoringTimestamp)}</strong>
        </div>
        <div>
          <span>Average response time</span>
          <strong>{service.averageResponseTime ?? "Unavailable"}</strong>
        </div>
        <div>
          <span>Last updated</span>
          <strong>{formatDateTime(service.lastUpdatedAt)}</strong>
        </div>
        <div>
          <span>Data state</span>
          <StatusBadge
            variant={mapCompletenessVariant(service.dataState)}
            aria-label={`Service data state ${normalizeText(service.dataState, "UNKNOWN")}`}
          >
            {normalizeText(service.dataState, "UNKNOWN")}
          </StatusBadge>
        </div>
      </div>
    </article>
  );
}

function ServiceTable({ services }) {
  return (
    <table className="project-service-health-table">
      <thead>
        <tr>
          <th>Service</th>
          <th>Service ID</th>
          <th>Service URL</th>
          <th>Health</th>
          <th>Availability</th>
          <th>Latest monitoring update</th>
          <th>Average response time</th>
          <th>Last updated</th>
          <th>Data state</th>
        </tr>
      </thead>
      <tbody>
        {services.map(service => (
          <tr key={service.serviceId} className={service.dataState === "NO_DATA" ? "unavailable" : ""}>
            <td data-label="Service">
              <strong>{normalizeText(service.serviceName, "Unavailable service")}</strong>
            </td>
            <td data-label="Service ID">{normalizeText(service.serviceId)}</td>
            <td data-label="Service URL">{normalizeText(service.serviceUrl)}</td>
            <td data-label="Health">
              <StatusBadge
                variant={mapHealthVariant(service.currentHealthStatus)}
                aria-label={`Current health status ${normalizeText(service.currentHealthStatus, "UNKNOWN")}`}
              >
                {normalizeText(service.currentHealthStatus, "UNKNOWN")}
              </StatusBadge>
            </td>
            <td data-label="Availability">{service.availabilityPercentage ?? "Unavailable"}</td>
            <td data-label="Latest monitoring update">{formatDateTime(service.latestMonitoringTimestamp)}</td>
            <td data-label="Average response time">{service.averageResponseTime ?? "Unavailable"}</td>
            <td data-label="Last updated">{formatDateTime(service.lastUpdatedAt)}</td>
            <td data-label="Data state">
              <StatusBadge
                variant={mapCompletenessVariant(service.dataState)}
                aria-label={`Service data state ${normalizeText(service.dataState, "UNKNOWN")}`}
              >
                {normalizeText(service.dataState, "UNKNOWN")}
              </StatusBadge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ProjectServiceHealthPage() {
  const { projectId } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [workspaceError, setWorkspaceError] = useState(null);
  const [healthSummary, setHealthSummary] = useState(null);
  const [healthError, setHealthError] = useState(null);
  const {
    filters,
    setSearch,
    setServiceHealthStatuses,
    setSortDirection,
    removeFilter,
    clearFilters,
    hasActiveFilters,
    activeFilterCount
  } = useObservabilityFilters({ defaultSortDirection: "ASC" });

  useEffect(() => {
    let active = true;

    setWorkspaceLoading(true);
    setWorkspaceError(null);
    setWorkspace(null);
    setHealthSummary(null);
    setHealthError(null);

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

  const loadHealth = useCallback(async () => {
    try {
      const result = await getProjectServiceHealth(projectId);
      setHealthSummary(result);
      setHealthError(null);
      return result;
    } catch (error) {
      const normalized = normalizeProjectServiceHealthError(error);
      setHealthError(normalized);
      throw normalized;
    }
  }, [projectId]);

  const {
    connectionState,
    lastSuccessfulRefreshAt,
    refresh: refreshNow
  } = useObservabilityPolling(loadHealth, {
    enabled: Boolean(workspace),
    immediate: Boolean(workspace)
  });

  const services = useMemo(
    () => sortServices(
      Array.isArray(healthSummary?.services) ? healthSummary.services : [],
      filters.sortDirection
    ),
    [filters.sortDirection, healthSummary?.services]
  );

  const filteredServices = useMemo(() => services.filter(service => {
    const healthStatus = normalizeText(service.currentHealthStatus, "UNKNOWN");
    const matchesStatus = !filters.serviceHealthStatuses.length
      || filters.serviceHealthStatuses.includes(healthStatus);

    return matchesSearch(filters.search, [
      service.serviceId,
      service.serviceName,
      service.serviceUrl,
      service.currentHealthStatus,
      service.dataState,
      service.availabilityPercentage,
      service.averageResponseTime
    ]) && matchesStatus;
  }), [filters.search, filters.serviceHealthStatuses, services]);

  const serviceFilterChips = useMemo(() => {
    const chips = [];

    if (filters.search) {
      chips.push({
        id: "search",
        label: "Search",
        value: filters.search,
        onRemove: () => removeFilter("search")
      });
    }

    filters.serviceHealthStatuses.forEach(status => {
      chips.push({
        id: `service-status-${status}`,
        label: "Service health",
        value: status,
        status: mapHealthVariant(status),
        onRemove: () => setServiceHealthStatuses(
          filters.serviceHealthStatuses.filter(entry => entry !== status)
        )
      });
    });

    if (filters.sortDirection !== "ASC") {
      chips.push({
        id: "sort",
        label: "Sort",
        value: filters.sortDirection,
        onRemove: () => setSortDirection("ASC")
      });
    }

    return chips;
  }, [filters.search, filters.serviceHealthStatuses, filters.sortDirection, removeFilter, setServiceHealthStatuses, setSortDirection]);

  const summary = healthSummary || {
    totalServices: 0,
    healthyCount: 0,
    degradedCount: 0,
    unavailableCount: 0,
    unknownCount: 0,
    dataCompleteness: "NO_DATA",
    generatedAt: null
  };

  const isRefreshing = connectionState === CONNECTION_STATE.REFRESHING && Boolean(healthSummary);
  const showInitialLoading = connectionState === CONNECTION_STATE.REFRESHING && !healthSummary;
  const connectionWarning = connectionState === CONNECTION_STATE.REFRESHING
    ? "Refreshing service health in the background. Existing data remains visible."
    : connectionState === CONNECTION_STATE.DEGRADED
      ? "A refresh failed, but the last successful service overview remains visible."
      : connectionState === CONNECTION_STATE.DISCONNECTED
        ? "Automatic service polling is paused until the connection recovers."
        : "";

  if (workspaceLoading) {
    return (
      <DashboardLayout>
        <section className="project-service-health-page">
          <LoadingState message="Loading project workspace..." />
        </section>
      </DashboardLayout>
    );
  }

  if (workspaceError) {
    return (
      <DashboardLayout>
        <section className="project-service-health-page">
          <ErrorState
            title={workspaceError.title}
            message={workspaceError.message}
          />
        </section>
      </DashboardLayout>
    );
  }

  const renderSummaryState = () => {
    if (showInitialLoading) {
      return <LoadingState message="Loading service health overview..." />;
    }

    if (isRefreshing) {
      return (
        <>
          <div className="project-service-health-banner" role="status">
            Refreshing service health overview in the background...
          </div>
          {renderSummaryContent()}
        </>
      );
    }

    return renderSummaryContent();
  };

  const renderSummaryContent = () => {
    if (healthError && !healthSummary) {
      return (
        <ErrorState
          title={healthError.title}
          message={healthError.message}
          action={(
            <button
              type="button"
              className="project-service-health-refresh-button"
              onClick={() => {
                void refreshNow().catch(() => {});
              }}
            >
              Refresh Services
            </button>
          )}
        />
      );
    }

    const isEmpty = !summary.totalServices;
    const isFilteredEmpty = summary.totalServices > 0 && !filteredServices.length;

    return (
      <>
        {healthError ? (
          <div className="project-service-health-banner" role="status">
            Some service data could not be refreshed. The last successful summary remains visible.
          </div>
        ) : null}

        <div className="project-service-health-summary-grid">
          <StatCard title="Total services" value={summary.totalServices} />
          <StatCard title="Healthy" value={summary.healthyCount} />
          <StatCard title="Degraded" value={summary.degradedCount} />
          <StatCard title="Unavailable" value={summary.unavailableCount} />
          <StatCard title="Unknown" value={summary.unknownCount} />
          <StatCard
            title="Data completeness"
            value={summary.dataCompleteness || "NO_DATA"}
            subtitle={`Generated at ${formatDateTime(summary.generatedAt)}`}
          />
        </div>

        <div className="project-service-health-toolbar">
          <button
            type="button"
            className="project-service-health-refresh-button"
            onClick={() => {
              void refreshNow().catch(() => {});
            }}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Refreshing..." : "Refresh Services"}
          </button>
        </div>

        <ObservabilityFilterPanel
          title="Refine services"
          searchEnabled
          searchPlaceholder="Search services, IDs, URLs, status or data state"
          searchValue={filters.search}
          onSearchChange={value => setSearch(value)}
          serviceHealthStatuses={filters.serviceHealthStatuses}
          serviceHealthStatusOptions={OBSERVABILITY_STATUS_OPTIONS.SERVICE.map(value => ({ value, label: value }))}
          onServiceHealthStatusesChange={setServiceHealthStatuses}
          sortDirection={filters.sortDirection}
          sortOptions={[
            { value: "ASC", label: "Ascending" },
            { value: "DESC", label: "Descending" }
          ]}
          onSortDirectionChange={value => setSortDirection(value)}
          activeFilterCount={activeFilterCount}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
        />

        <ObservabilityFilterChips
          chips={serviceFilterChips}
          onClearAll={clearFilters}
        />

        <ObservabilityConnectionStatus
          status={connectionState}
          lastSuccessfulRefreshAt={lastSuccessfulRefreshAt}
          warning={connectionWarning}
        />

        <div className="project-service-health-banner" role="status">
          {summary.dataCompleteness === "PARTIAL"
            ? "Some service health fields could not be resolved and are shown with safe fallbacks."
            : summary.dataCompleteness === "NO_DATA"
              ? "No service health data is currently available for this project."
              : "Service health data is available for the linked project services."}
        </div>

        <section className="project-service-health-results">
          <div className="project-service-health-results-summary">
            <StatusBadge
              variant={mapCompletenessVariant(summary.dataCompleteness)}
              aria-label={`Summary data completeness ${summary.dataCompleteness || "NO_DATA"}`}
            >
              {summary.dataCompleteness || "NO_DATA"}
            </StatusBadge>
            <span>Generated at {formatDateTime(summary.generatedAt)}</span>
          </div>

          <div className="project-service-health-responsive">
            {isEmpty ? (
              <EmptyState
                title="No active services"
                message="This project does not yet have associated services."
                action={(
                  <button
                    type="button"
                    className="project-service-health-refresh-button"
                    onClick={() => {
                      void refreshNow().catch(() => {});
                    }}
                  >
                    Refresh Services
                  </button>
                )}
              />
            ) : isFilteredEmpty ? (
              <EmptyState
                title="No matching services"
                message="Clear filters to view the linked services for this project."
                action={(
                  <button
                    type="button"
                    className="project-service-health-refresh-button"
                    onClick={() => {
                      void refreshNow().catch(() => {});
                    }}
                  >
                    Refresh Services
                  </button>
                )}
              />
            ) : (
              <>
                <ServiceTable services={filteredServices} />
                <div className="project-service-health-card-list">
                  {filteredServices.map(service => (
                    <ServiceCard key={service.serviceId} service={service} />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </>
    );
  };

  return (
    <DashboardLayout>
      <section className="project-service-health-page">
        <PageHero
          eyebrow="Project Services"
          title={workspace.projectName}
          description={workspace.projectDescription || "Project service health overview."}
          action={(
            <StatusBadge
              variant={workspace.projectStatus}
              aria-label={`Project status ${workspace.projectStatus}`}
            >
              {workspace.projectStatus}
            </StatusBadge>
          )}
        />

        <ProjectContextNav active="services" />

        <div className="project-service-health-context-grid">
          <article className="project-service-health-context-card">
            <span>Project ID</span>
            <strong>{workspace.projectId || projectId}</strong>
          </article>
          <article className="project-service-health-context-card">
            <span>Caller role</span>
            <strong>{workspace.callerProjectRole}</strong>
          </article>
          <article className="project-service-health-context-card">
            <span>Service associations</span>
            <strong>{workspace.serviceAssociationCount}</strong>
          </article>
          <article className="project-service-health-context-card">
            <span>Device associations</span>
            <strong>{workspace.deviceAssociationCount}</strong>
          </article>
        </div>

        {renderSummaryState()}
      </section>
    </DashboardLayout>
  );
}
