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
import { getDevicesByIds } from "../../services/deviceService";
import {
  getProjectHealthSummary,
  normalizeProjectHealthSummaryError
} from "../../services/projectHealthSummaryService";
import { getProjectWorkspace, normalizeWorkspaceError } from "../../services/projectWorkspaceService";
import { getMonitoredServicesByIds } from "../../services/serviceMonitoringService";
import { normalizeSearchText } from "../../utils/observabilityFilterParams";

function ResourceSection({
  title,
  loading,
  error,
  emptyMessage,
  items,
  renderItem
}) {
  if (loading) {
    return <LoadingState message={`Loading ${title.toLowerCase()}...`} />;
  }

  if (error) {
    return (
      <EmptyState
        title={`${title} unavailable`}
        message={error}
      />
    );
  }

  if (!items.length) {
    return (
      <EmptyState
        title={title}
        message={emptyMessage}
      />
    );
  }

  return (
    <div className="project-identifier-card">
      <h3>{title}</h3>
      <ul className="project-identifier-list">
        {items.map(item => (
          <li key={item.id}>
            {renderItem(item)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function HealthValue({ value, fallback }) {
  return <strong>{value ?? fallback}</strong>;
}

function matchesSearch(search, values) {
  const query = normalizeSearchText(search).toLowerCase();

  if (!query) {
    return true;
  }

  return values.some(value => String(value ?? "").toLowerCase().includes(query));
}

export default function ProjectWorkspacePage() {
  const { projectId } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [healthSummary, setHealthSummary] = useState(null);
  const [healthError, setHealthError] = useState(null);

  const [serviceDetails, setServiceDetails] = useState([]);
  const [deviceDetails, setDeviceDetails] = useState([]);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [deviceLoading, setDeviceLoading] = useState(false);
  const [serviceError, setServiceError] = useState("");
  const [deviceError, setDeviceError] = useState("");

  const {
    filters,
    setSearch,
    removeFilter,
    clearFilters,
    hasActiveFilters,
    activeFilterCount
  } = useObservabilityFilters();

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);
    setWorkspace(null);
    setHealthSummary(null);
    setHealthError(null);
    setServiceDetails([]);
    setDeviceDetails([]);
    setServiceLoading(false);
    setDeviceLoading(false);
    setServiceError("");
    setDeviceError("");

    getProjectWorkspace(projectId)
      .then(result => {
        if (active) {
          setWorkspace(result);
        }
      })
      .catch(err => {
        if (active) {
          setError(normalizeWorkspaceError(err));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [projectId]);

  useEffect(() => {
    let active = true;

    if (!workspace) {
      return () => {
        active = false;
      };
    }

    const loadServiceDetails = async () => {
      const ids = Array.isArray(workspace.serviceIds) ? [...workspace.serviceIds] : [];

      if (!ids.length) {
        setServiceDetails([]);
        setServiceLoading(false);
        setServiceError("");
        return;
      }

      setServiceLoading(true);
      setServiceError("");

      try {
        const results = await getMonitoredServicesByIds(ids);
        if (!active) {
          return;
        }

        setServiceDetails(
          results.map(({ serviceId, service }) => ({
            id: serviceId,
            serviceId,
            name: service?.serviceName || "Unavailable service",
            serviceName: service?.serviceName || null,
            serviceUrl: service?.serviceUrl || null,
            status: service?.status || null,
            primary: service?.serviceUrl || serviceId,
            secondary: service?.status ? `Status: ${service.status}` : "Unavailable",
            unavailable: !service
          }))
        );
      } catch {
        if (active) {
          setServiceError("Service details are temporarily unavailable.");
          setServiceDetails(
            ids.map(serviceId => ({
              id: serviceId,
              name: "Unavailable service",
              primary: serviceId,
              secondary: "Unavailable",
              unavailable: true
            }))
          );
        }
      } finally {
        if (active) {
          setServiceLoading(false);
        }
      }
    };

    const loadDeviceDetails = async () => {
      const ids = Array.isArray(workspace.deviceIds) ? [...workspace.deviceIds] : [];

      if (!ids.length) {
        setDeviceDetails([]);
        setDeviceLoading(false);
        setDeviceError("");
        return;
      }

      setDeviceLoading(true);
      setDeviceError("");

      try {
        const results = await getDevicesByIds(ids);
        if (!active) {
          return;
        }

        setDeviceDetails(
          results.map(({ deviceId, device }) => ({
            id: deviceId,
            deviceId,
            name: device?.deviceName || "Unavailable device",
            deviceName: device?.deviceName || null,
            deviceType: device?.deviceType || null,
            ipAddress: device?.ipAddress || null,
            currentStatus: device?.status || null,
            lastHeartbeat: device?.lastHeartbeat || null,
            primary: device?.ipAddress || deviceId,
            secondary: device?.status
              ? `Heartbeat: ${device.lastHeartbeat ? new Date(device.lastHeartbeat).toLocaleString("en-IE") : "Unknown"}`
              : "Unavailable",
            unavailable: !device
          }))
        );
      } catch {
        if (active) {
          setDeviceError("Device details are temporarily unavailable.");
          setDeviceDetails(
            ids.map(deviceId => ({
              id: deviceId,
              name: "Unavailable device",
              primary: deviceId,
              secondary: "Unavailable",
              unavailable: true
            }))
          );
        }
      } finally {
        if (active) {
          setDeviceLoading(false);
        }
      }
    };

    loadServiceDetails();
    loadDeviceDetails();

    return () => {
      active = false;
    };
  }, [workspace]);

  const loadHealthSummary = useCallback(async () => {
    try {
      const result = await getProjectHealthSummary(projectId);
      setHealthSummary(result);
      setHealthError(null);
      return result;
    } catch (err) {
      const normalized = normalizeProjectHealthSummaryError(err);
      setHealthError(normalized);
      throw normalized;
    }
  }, [projectId]);

  const {
    connectionState: healthConnectionState,
    lastSuccessfulRefreshAt: healthLastSuccessfulRefreshAt,
    refresh: refreshHealthSummary
  } = useObservabilityPolling(loadHealthSummary, {
    enabled: Boolean(workspace),
    immediate: Boolean(workspace)
  });

  const serviceIds = useMemo(() => workspace?.serviceIds || [], [workspace]);
  const deviceIds = useMemo(() => workspace?.deviceIds || [], [workspace]);

  const filteredServiceDetails = useMemo(() => serviceDetails.filter(item => matchesSearch(filters.search, [
    item.serviceId,
    item.name,
    item.serviceName,
    item.serviceUrl,
    item.status,
    item.primary,
    item.secondary
  ])), [filters.search, serviceDetails]);

  const filteredDeviceDetails = useMemo(() => deviceDetails.filter(item => matchesSearch(filters.search, [
    item.deviceId,
    item.name,
    item.deviceName,
    item.deviceType,
    item.ipAddress,
    item.currentStatus,
    item.lastHeartbeat,
    item.primary,
    item.secondary
  ])), [deviceDetails, filters.search]);

  const workspaceFilterChips = useMemo(() => {
    if (!filters.search) {
      return [];
    }

    return [{
      id: "search",
      label: "Search",
      value: filters.search,
      onRemove: () => removeFilter("search")
    }];
  }, [filters.search, removeFilter]);

  const emptyWorkspace = workspace?.emptyWorkspace
    || (serviceIds.length === 0 && deviceIds.length === 0);
  const hasPartialFailure = Boolean(serviceError || deviceError);
  const hasPartialSuccess = [...serviceDetails, ...deviceDetails].some(item => item.unavailable);

  const projectHealthStatus = healthSummary?.overallHealth || "UNKNOWN";
  const monitoringStatus = healthSummary?.monitoringStatus || "UNAVAILABLE";
  const completeness = healthSummary?.dataCompleteness || "NO_DATA";
  const lastTelemetry = healthSummary?.latestTelemetryReceivedAt
    ? new Date(healthSummary.latestTelemetryReceivedAt).toLocaleString("en-IE")
    : "No telemetry timestamp available yet";
  const isHealthRefreshing = healthConnectionState === CONNECTION_STATE.REFRESHING && Boolean(healthSummary);
  const showHealthInitialLoading = healthConnectionState === CONNECTION_STATE.REFRESHING && !healthSummary;
  const healthConnectionWarning = healthConnectionState === CONNECTION_STATE.REFRESHING
    ? "Refreshing the project health summary in the background. Existing data remains visible."
    : healthConnectionState === CONNECTION_STATE.DEGRADED
      ? "A refresh failed, but the last successful project health summary remains visible."
      : healthConnectionState === CONNECTION_STATE.DISCONNECTED
        ? "Automatic project health polling is paused until the connection recovers."
        : "";

  const healthCards = [
    {
      title: "Overall Project Health",
      value: projectHealthStatus,
      subtitle: `Data: ${completeness}`
    },
    {
      title: "Total Registered Devices",
      value: healthSummary?.totalRegisteredDevices ?? 0
    },
    {
      title: "Online Devices",
      value: healthSummary?.onlineDevices ?? 0
    },
    {
      title: "Offline Devices",
      value: healthSummary?.offlineDevices ?? 0
    },
    {
      title: "Active Monitoring Services",
      value: healthSummary?.activeMonitoringServices ?? 0
    },
    {
      title: "Last Telemetry Received",
      value: lastTelemetry,
      subtitle: "Most recent resolved telemetry timestamp"
    }
  ];

  const renderHealthPanel = () => {
    if (showHealthInitialLoading) {
      return <LoadingState message="Loading project health summary..." />;
    }

    if (healthError && !healthSummary) {
      return (
        <ErrorState
          title={healthError.title}
          message={healthError.message}
          action={(
            <button
              type="button"
              className="project-workspace-refresh-button"
              onClick={() => {
                void refreshHealthSummary().catch(() => {});
              }}
            >
              Refresh Health
            </button>
          )}
        />
      );
    }

    return (
      <>
        <ObservabilityConnectionStatus
          status={healthConnectionState}
          lastSuccessfulRefreshAt={healthLastSuccessfulRefreshAt}
          warning={healthConnectionWarning}
        />

        <div className="project-workspace-health-grid">
          {healthCards.map(card => (
            <StatCard
              key={card.title}
              title={card.title}
              value={card.value}
              subtitle={card.subtitle}
            />
          ))}

          <div className="project-workspace-summary-card project-workspace-health-status-card">
            <span>Monitoring Status</span>
            <StatusBadge variant={monitoringStatus}>{monitoringStatus}</StatusBadge>
            <small>
              Backend status for linked project resources.
            </small>
          </div>
        </div>

        <div className="project-workspace-partial-state" role="status">
          {completeness === "PARTIAL"
            ? "Some operational fields could not be resolved. The workspace stays available with partial data."
            : completeness === "NO_DATA"
              ? "No operational data is currently available for this project."
              : "Operational data is available for the linked project resources."}
        </div>
      </>
    );
  };

  const serviceEmptyMessage = filters.search
    ? "No services match the current search."
    : "No active service associations yet.";
  const deviceEmptyMessage = filters.search
    ? "No devices match the current search."
    : "No active device associations yet.";

  if (loading) {
    return (
      <DashboardLayout>
        <section className="project-workspace-page">
          <LoadingState message="Loading project workspace..." />
        </section>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <section className="project-workspace-page">
          <ErrorState
            title={error.title}
            message={error.message}
          />
        </section>
      </DashboardLayout>
    );
  }

  if (!workspace) {
    return (
      <DashboardLayout>
        <section className="project-workspace-page">
          <EmptyState
            title="Empty workspace"
            message="This project does not yet have associated services or devices."
          />
        </section>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <section className="project-workspace-page">
        <PageHero
          eyebrow="Project Observability"
          title={workspace.projectName}
          description={workspace.projectDescription || "No project description provided."}
          action={<StatusBadge variant={workspace.projectStatus}>{workspace.projectStatus}</StatusBadge>}
        />

        <ProjectContextNav active="workspace" />

        <div className="project-workspace-summary-grid">
          <article className="project-workspace-summary-card">
            <span>Caller role</span>
            <strong>{workspace.callerProjectRole}</strong>
          </article>
          <article className="project-workspace-summary-card">
            <span>Services</span>
            <strong>{workspace.serviceAssociationCount}</strong>
          </article>
          <article className="project-workspace-summary-card">
            <span>Devices</span>
            <strong>{workspace.deviceAssociationCount}</strong>
          </article>
          <article className="project-workspace-summary-card">
            <span>Generated</span>
            <strong>{workspace.generatedAt ? new Date(workspace.generatedAt).toLocaleString("en-IE") : "Now"}</strong>
          </article>
        </div>

        <ObservabilityFilterPanel
          title="Search linked resources"
          searchEnabled
          searchPlaceholder="Search services, devices, IDs, status or IP addresses"
          searchValue={filters.search}
          onSearchChange={value => setSearch(value)}
          activeFilterCount={activeFilterCount}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
          compact
        />

        <ObservabilityFilterChips
          chips={workspaceFilterChips}
          onClearAll={clearFilters}
        />

        <section className="project-workspace-health-panel">
          <div className="project-workspace-health-header">
            <div>
              <h2>Project Health Summary</h2>
              <p>Lightweight operational summary for the currently selected project.</p>
            </div>
            <button
              type="button"
              className="project-workspace-refresh-button"
              onClick={() => {
                void refreshHealthSummary().catch(() => {});
              }}
              disabled={isHealthRefreshing}
            >
              {isHealthRefreshing ? "Refreshing..." : "Refresh Health"}
            </button>
          </div>

          {renderHealthPanel()}
        </section>

        {(hasPartialFailure || hasPartialSuccess) ? (
          <div className="project-workspace-partial-state" role="status">
            {hasPartialFailure
              ? "Some linked resources could not be enriched. The workspace stays available and the original identifiers remain visible."
              : "Some linked resources were found, while others are shown by identifier only."}
          </div>
        ) : null}

        {emptyWorkspace ? (
          <EmptyState
            title="Empty workspace"
            message="This project does not yet have associated services or devices."
          />
        ) : (
          <div className="project-workspace-content-grid">
            <ResourceSection
              title="Associated services"
              loading={serviceLoading}
              error={serviceError}
              items={filteredServiceDetails}
              emptyMessage={serviceEmptyMessage}
              renderItem={item => (
                <article className={`project-resource-item ${item.unavailable ? "unavailable" : ""}`}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.primary}</span>
                  </div>
                  <small>{item.secondary}</small>
                </article>
              )}
            />
            <ResourceSection
              title="Associated devices"
              loading={deviceLoading}
              error={deviceError}
              items={filteredDeviceDetails}
              emptyMessage={deviceEmptyMessage}
              renderItem={item => (
                <article className={`project-resource-item ${item.unavailable ? "unavailable" : ""}`}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.primary}</span>
                  </div>
                  <small>{item.secondary}</small>
                </article>
              )}
            />
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}
