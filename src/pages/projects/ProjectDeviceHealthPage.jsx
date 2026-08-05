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
  getProjectDeviceHealth,
  normalizeProjectDeviceHealthError
} from "../../services/projectDeviceHealthService";
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
    case "OFFLINE":
      return "offline";
    case "UNAVAILABLE":
      return "unknown";
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

function sortDevices(devices = [], sortDirection = "ASC") {
  const comparator = (left, right) => {
    const leftName = String(left?.deviceName || "").toLowerCase();
    const rightName = String(right?.deviceName || "").toLowerCase();

    if (leftName < rightName) {
      return -1;
    }

    if (leftName > rightName) {
      return 1;
    }

    return String(left?.deviceId || "").localeCompare(String(right?.deviceId || ""));
  };

  const normalized = [...devices].sort(comparator);

  if (sortDirection === "DESC") {
    return normalized.sort((left, right) => {
      const leftName = String(left?.deviceName || "").toLowerCase();
      const rightName = String(right?.deviceName || "").toLowerCase();

      if (leftName < rightName) {
        return 1;
      }

      if (leftName > rightName) {
        return -1;
      }

      return String(left?.deviceId || "").localeCompare(String(right?.deviceId || ""));
    });
  }

  return normalized;
}

function DeviceCard({ device }) {
  return (
    <article className={`project-device-health-card ${device.dataState === "NO_DATA" ? "unavailable" : ""}`}>
      <header className="project-device-health-card-header">
        <div>
          <strong>{normalizeText(device.deviceName, "Unavailable device")}</strong>
          <span>{normalizeText(device.deviceId)}</span>
        </div>
        <StatusBadge
          variant={mapHealthVariant(device.healthStatus)}
          aria-label={`Current health status ${normalizeText(device.healthStatus, "UNKNOWN")}`}
        >
          {normalizeText(device.healthStatus, "UNKNOWN")}
        </StatusBadge>
      </header>

      <div className="project-device-health-card-grid">
        <div>
          <span>Device type</span>
          <strong>{normalizeText(device.deviceType)}</strong>
        </div>
        <div>
          <span>IP address</span>
          <strong>{normalizeText(device.ipAddress)}</strong>
        </div>
        <div>
          <span>Current status</span>
          <strong>{normalizeText(device.currentStatus, "Unavailable")}</strong>
        </div>
        <div>
          <span>Availability</span>
          <strong>{device.availability ?? "Unavailable"}</strong>
        </div>
        <div>
          <span>Latest heartbeat</span>
          <strong>{formatDateTime(device.latestHeartbeat)}</strong>
        </div>
        <div>
          <span>Latest telemetry received</span>
          <strong>{formatDateTime(device.latestTelemetryReceivedAt)}</strong>
        </div>
        <div>
          <span>Last updated</span>
          <strong>{formatDateTime(device.lastUpdatedAt)}</strong>
        </div>
        <div>
          <span>Data state</span>
          <StatusBadge
            variant={mapCompletenessVariant(device.dataState)}
            aria-label={`Device data state ${normalizeText(device.dataState, "UNKNOWN")}`}
          >
            {normalizeText(device.dataState, "UNKNOWN")}
          </StatusBadge>
        </div>
      </div>
    </article>
  );
}

function DeviceTable({ devices }) {
  return (
    <table className="project-device-health-table">
      <thead>
        <tr>
          <th>Device</th>
          <th>Device ID</th>
          <th>Device type</th>
          <th>IP address</th>
          <th>Current status</th>
          <th>Health</th>
          <th>Availability</th>
          <th>Latest heartbeat</th>
          <th>Latest telemetry received</th>
          <th>Last updated</th>
          <th>Data state</th>
        </tr>
      </thead>
      <tbody>
        {devices.map(device => (
          <tr key={device.deviceId} className={device.dataState === "NO_DATA" ? "unavailable" : ""}>
            <td data-label="Device">
              <strong>{normalizeText(device.deviceName, "Unavailable device")}</strong>
            </td>
            <td data-label="Device ID">{normalizeText(device.deviceId)}</td>
            <td data-label="Device type">{normalizeText(device.deviceType)}</td>
            <td data-label="IP address">{normalizeText(device.ipAddress)}</td>
            <td data-label="Current status">{normalizeText(device.currentStatus, "Unavailable")}</td>
            <td data-label="Health">
              <StatusBadge
                variant={mapHealthVariant(device.healthStatus)}
                aria-label={`Current health status ${normalizeText(device.healthStatus, "UNKNOWN")}`}
              >
                {normalizeText(device.healthStatus, "UNKNOWN")}
              </StatusBadge>
            </td>
            <td data-label="Availability">{device.availability ?? "Unavailable"}</td>
            <td data-label="Latest heartbeat">{formatDateTime(device.latestHeartbeat)}</td>
            <td data-label="Latest telemetry received">{formatDateTime(device.latestTelemetryReceivedAt)}</td>
            <td data-label="Last updated">{formatDateTime(device.lastUpdatedAt)}</td>
            <td data-label="Data state">
              <StatusBadge
                variant={mapCompletenessVariant(device.dataState)}
                aria-label={`Device data state ${normalizeText(device.dataState, "UNKNOWN")}`}
              >
                {normalizeText(device.dataState, "UNKNOWN")}
              </StatusBadge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ProjectDeviceHealthPage() {
  const { projectId } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [workspaceError, setWorkspaceError] = useState(null);
  const [deviceSummary, setDeviceSummary] = useState(null);
  const [deviceError, setDeviceError] = useState(null);
  const {
    filters,
    setSearch,
    setDeviceHealthStatuses,
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
    setDeviceSummary(null);
    setDeviceError(null);

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

  const loadDeviceHealth = useCallback(async () => {
    try {
      const result = await getProjectDeviceHealth(projectId);
      setDeviceSummary(result);
      setDeviceError(null);
      return result;
    } catch (error) {
      const normalized = normalizeProjectDeviceHealthError(error);
      setDeviceError(normalized);
      throw normalized;
    }
  }, [projectId]);

  const {
    connectionState,
    lastSuccessfulRefreshAt,
    refresh: refreshNow
  } = useObservabilityPolling(loadDeviceHealth, {
    enabled: Boolean(workspace),
    immediate: Boolean(workspace)
  });

  const devices = useMemo(
    () => sortDevices(
      Array.isArray(deviceSummary?.devices) ? deviceSummary.devices : [],
      filters.sortDirection
    ),
    [deviceSummary?.devices, filters.sortDirection]
  );

  const filteredDevices = useMemo(() => devices.filter(device => {
    const healthStatus = normalizeText(device.healthStatus, "UNKNOWN");
    const matchesStatus = !filters.deviceHealthStatuses.length
      || filters.deviceHealthStatuses.includes(healthStatus);

    return matchesSearch(filters.search, [
      device.deviceId,
      device.deviceName,
      device.deviceType,
      device.ipAddress,
      device.currentStatus,
      device.healthStatus,
      device.availability,
      device.latestHeartbeat,
      device.latestTelemetryReceivedAt,
      device.lastUpdatedAt,
      device.dataState
    ]) && matchesStatus;
  }), [devices, filters.deviceHealthStatuses, filters.search]);

  const deviceFilterChips = useMemo(() => {
    const chips = [];

    if (filters.search) {
      chips.push({
        id: "search",
        label: "Search",
        value: filters.search,
        onRemove: () => removeFilter("search")
      });
    }

    filters.deviceHealthStatuses.forEach(status => {
      chips.push({
        id: `device-status-${status}`,
        label: "Device health",
        value: status,
        status: mapHealthVariant(status),
        onRemove: () => setDeviceHealthStatuses(
          filters.deviceHealthStatuses.filter(entry => entry !== status)
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
  }, [filters.search, filters.deviceHealthStatuses, filters.sortDirection, removeFilter, setDeviceHealthStatuses, setSortDirection]);

  const summary = deviceSummary || {
    totalDevices: 0,
    onlineCount: 0,
    offlineCount: 0,
    degradedCount: 0,
    unavailableCount: 0,
    unknownCount: 0,
    dataCompleteness: "NO_DATA",
    generatedAt: null,
    devices: []
  };

  const isRefreshing = connectionState === CONNECTION_STATE.REFRESHING && Boolean(deviceSummary);
  const showInitialLoading = connectionState === CONNECTION_STATE.REFRESHING && !deviceSummary;
  const connectionWarning = connectionState === CONNECTION_STATE.REFRESHING
    ? "Refreshing device health in the background. Existing data remains visible."
    : connectionState === CONNECTION_STATE.DEGRADED
      ? "A refresh failed, but the last successful device overview remains visible."
      : connectionState === CONNECTION_STATE.DISCONNECTED
        ? "Automatic device polling is paused until the connection recovers."
        : "";

  if (workspaceLoading) {
    return (
      <DashboardLayout>
        <section className="project-device-health-page">
          <LoadingState message="Loading project workspace..." />
        </section>
      </DashboardLayout>
    );
  }

  if (workspaceError) {
    return (
      <DashboardLayout>
        <section className="project-device-health-page">
          <ErrorState
            title={workspaceError.title}
            message={workspaceError.message}
          />
        </section>
      </DashboardLayout>
    );
  }

  const renderSummaryContent = () => {
    if (showInitialLoading) {
      return <LoadingState message="Loading device health overview..." />;
    }

    if (deviceError && !deviceSummary) {
      return (
        <ErrorState
          title={deviceError.title}
          message={deviceError.message}
          action={(
            <button
              type="button"
              className="project-device-health-refresh-button"
              onClick={() => {
                void refreshNow().catch(() => {});
              }}
            >
              Refresh Devices
            </button>
          )}
        />
      );
    }

    const isEmpty = !summary.totalDevices;
    const isFilteredEmpty = summary.totalDevices > 0 && !filteredDevices.length;

    return (
      <>
        {deviceError ? (
          <div className="project-device-health-banner" role="status">
            Some device data could not be refreshed. The last successful summary remains visible.
          </div>
        ) : null}

        <div className="project-device-health-summary-grid">
          <StatCard title="Total devices" value={summary.totalDevices} />
          <StatCard title="Online" value={summary.onlineCount} />
          <StatCard title="Offline" value={summary.offlineCount} />
          <StatCard title="Degraded" value={summary.degradedCount} />
          <StatCard title="Unavailable" value={summary.unavailableCount} />
          <StatCard
            title="Data completeness"
            value={summary.dataCompleteness || "NO_DATA"}
            subtitle={`Generated at ${formatDateTime(summary.generatedAt)}`}
          />
        </div>

        <div className="project-device-health-toolbar">
          <button
            type="button"
            className="project-device-health-refresh-button"
            onClick={() => {
              void refreshNow().catch(() => {});
            }}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Refreshing..." : "Refresh Devices"}
          </button>
        </div>

        <ObservabilityFilterPanel
          title="Refine devices"
          searchEnabled
          searchPlaceholder="Search devices, IDs, types, IPs, status or data state"
          searchValue={filters.search}
          onSearchChange={value => setSearch(value)}
          deviceHealthStatuses={filters.deviceHealthStatuses}
          deviceHealthStatusOptions={OBSERVABILITY_STATUS_OPTIONS.DEVICE.map(value => ({ value, label: value }))}
          onDeviceHealthStatusesChange={setDeviceHealthStatuses}
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
          chips={deviceFilterChips}
          onClearAll={clearFilters}
        />

        <ObservabilityConnectionStatus
          status={connectionState}
          lastSuccessfulRefreshAt={lastSuccessfulRefreshAt}
          warning={connectionWarning}
        />

        <div className="project-device-health-banner" role="status">
          {summary.dataCompleteness === "PARTIAL"
            ? "Some device data could not be resolved and is shown with safe fallbacks."
            : summary.dataCompleteness === "NO_DATA"
              ? "No device health data is currently available for this project."
              : "Device health data is available for the linked project devices."}
        </div>

        <section className="project-device-health-results">
          <div className="project-device-health-results-summary">
            <StatusBadge
              variant={mapCompletenessVariant(summary.dataCompleteness)}
              aria-label={`Summary data completeness ${summary.dataCompleteness || "NO_DATA"}`}
            >
              {summary.dataCompleteness || "NO_DATA"}
            </StatusBadge>
            <span>Generated at {formatDateTime(summary.generatedAt)}</span>
          </div>

          <div className="project-device-health-responsive">
            {isEmpty ? (
              <EmptyState
                title="No active devices"
                message="This project does not yet have associated devices."
                action={(
                  <button
                    type="button"
                    className="project-device-health-refresh-button"
                    onClick={() => {
                      void refreshNow().catch(() => {});
                    }}
                  >
                    Refresh Devices
                  </button>
                )}
              />
            ) : isFilteredEmpty ? (
              <EmptyState
                title="No matching devices"
                message="Clear filters to view the linked devices for this project."
                action={(
                  <button
                    type="button"
                    className="project-device-health-refresh-button"
                    onClick={() => {
                      void refreshNow().catch(() => {});
                    }}
                  >
                    Refresh Devices
                  </button>
                )}
              />
            ) : (
              <>
                <DeviceTable devices={filteredDevices} />
                <div className="project-device-health-card-list">
                  {filteredDevices.map(device => (
                    <DeviceCard key={device.deviceId} device={device} />
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
      <section className="project-device-health-page">
        <PageHero
          eyebrow="Project Devices"
          title={workspace.projectName}
          description={workspace.projectDescription || "Project device health overview."}
          action={(
            <StatusBadge
              variant={workspace.projectStatus}
              aria-label={`Project status ${workspace.projectStatus}`}
            >
              {workspace.projectStatus}
            </StatusBadge>
          )}
        />

        <ProjectContextNav active="devices" />

        <div className="project-device-health-context-grid">
          <article className="project-device-health-context-card">
            <span>Project ID</span>
            <strong>{workspace.projectId || projectId}</strong>
          </article>
          <article className="project-device-health-context-card">
            <span>Caller role</span>
            <strong>{workspace.callerProjectRole}</strong>
          </article>
          <article className="project-device-health-context-card">
            <span>Device associations</span>
            <strong>{workspace.deviceAssociationCount}</strong>
          </article>
          <article className="project-device-health-context-card">
            <span>Service associations</span>
            <strong>{workspace.serviceAssociationCount}</strong>
          </article>
        </div>

        {renderSummaryContent()}
      </section>
    </DashboardLayout>
  );
}
