import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import DashboardLayout from "../../components/layout/DashboardLayout";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import LoadingState from "../../components/ui/LoadingState";
import PageHero from "../../components/ui/PageHero";
import StatCard from "../../components/ui/StatCard";
import StatusBadge from "../../components/ui/StatusBadge";
import ProjectContextNav from "../../components/projects/ProjectContextNav";
import { getProjectWorkspace, normalizeWorkspaceError } from "../../services/projectWorkspaceService";
import {
  getProjectServiceHealth,
  normalizeProjectServiceHealthError
} from "../../services/projectServiceHealthService";

const REFRESH_INTERVAL_MS = 60000;

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
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthRefreshing, setHealthRefreshing] = useState(false);
  const [healthError, setHealthError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [sortDirection, setSortDirection] = useState("ASC");
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    let active = true;

    setWorkspaceLoading(true);
    setWorkspaceError(null);
    setWorkspace(null);
    setHealthSummary(null);
    setHealthError(null);
    setHealthLoading(false);
    setHealthRefreshing(false);

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
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!workspace) {
      return undefined;
    }

    let active = true;

    const loadHealth = async () => {
      if (inFlightRef.current) {
        return;
      }

      inFlightRef.current = true;
      if (healthSummary) {
        setHealthRefreshing(true);
      } else {
        setHealthLoading(true);
      }
      setHealthError(null);

      try {
        const result = await getProjectServiceHealth(projectId);

        if (active && mountedRef.current) {
          setHealthSummary(result);
        }
      } catch (error) {
        if (active && mountedRef.current) {
          setHealthError(normalizeProjectServiceHealthError(error));
        }
      } finally {
        inFlightRef.current = false;
        if (active && mountedRef.current) {
          setHealthLoading(false);
          setHealthRefreshing(false);
        }
      }
    };

    loadHealth();

    const interval = window.setInterval(() => {
      if (!inFlightRef.current && active && mountedRef.current) {
        loadHealth();
      }
    }, REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [workspace, projectId, refreshTick]);

  const services = useMemo(
    () => sortServices(Array.isArray(healthSummary?.services) ? healthSummary.services : [], sortDirection),
    [healthSummary?.services, sortDirection]
  );

  const summary = healthSummary || {
    totalServices: 0,
    healthyCount: 0,
    degradedCount: 0,
    unavailableCount: 0,
    unknownCount: 0,
    dataCompleteness: "NO_DATA",
    generatedAt: null
  };

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
    if (healthLoading && !healthSummary) {
      return <LoadingState message="Loading service health overview..." />;
    }

    if (healthRefreshing && healthSummary) {
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
              onClick={() => setRefreshTick(value => value + 1)}
            >
              Refresh Services
            </button>
          )}
        />
      );
    }

    const isEmpty = !summary.totalServices;

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
          <label>
            <span>Sort direction</span>
            <select
              aria-label="Sort direction"
              value={sortDirection}
              onChange={event => setSortDirection(event.target.value)}
            >
              <option value="ASC">Ascending</option>
              <option value="DESC">Descending</option>
            </select>
          </label>

          <button
            type="button"
            className="project-service-health-refresh-button"
            onClick={() => setRefreshTick(value => value + 1)}
            disabled={healthLoading || healthRefreshing}
          >
            {healthLoading || healthRefreshing ? "Refreshing..." : "Refresh Services"}
          </button>
        </div>

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
                    onClick={() => setRefreshTick(value => value + 1)}
                  >
                    Refresh Services
                  </button>
                )}
              />
            ) : (
              <>
                <ServiceTable services={services} />
                <div className="project-service-health-card-list">
                  {services.map(service => (
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
