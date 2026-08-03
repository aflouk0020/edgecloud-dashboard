import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import DashboardLayout from "../../components/layout/DashboardLayout";
import ErrorState from "../../components/ui/ErrorState";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import PageHero from "../../components/ui/PageHero";
import StatusBadge from "../../components/ui/StatusBadge";
import { getProjectWorkspace, normalizeWorkspaceError } from "../../services/projectWorkspaceService";
import {
  getMonitoredServicesByIds
} from "../../services/serviceMonitoringService";
import { getDevicesByIds } from "../../services/deviceService";

const NAV_ITEMS = [
  { label: "Observability", path: "workspace" },
  { label: "Services", path: "services" },
  { label: "Devices", path: "devices" },
  { label: "Metrics", path: "metrics" }
];

function WorkspaceNav() {
  return (
    <div className="project-workspace-nav" aria-label="Project workspace navigation">
      {NAV_ITEMS.map(item => (
        <span key={item.path} className="project-workspace-nav-item">
          {item.label}
        </span>
      ))}
      <Link className="project-workspace-nav-back" to="/dashboard">
        Back to dashboard
      </Link>
    </div>
  );
}

function ResourceSection({
  title,
  loading,
  error,
  emptyMessage,
  items,
  renderItem
}) {
  if (loading) {
    return (
      <LoadingState message={`Loading ${title.toLowerCase()}...`} />
    );
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

export default function ProjectWorkspacePage() {
  const { projectId } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [serviceDetails, setServiceDetails] = useState([]);
  const [deviceDetails, setDeviceDetails] = useState([]);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [deviceLoading, setDeviceLoading] = useState(false);
  const [serviceError, setServiceError] = useState("");
  const [deviceError, setDeviceError] = useState("");

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);
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
          setWorkspace(null);
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
      const ids = Array.isArray(workspace.serviceIds) ? workspace.serviceIds : [];

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
            name: service?.serviceName || "Unavailable service",
            primary: service?.serviceUrl || serviceId,
            secondary: service?.status
              ? `Status: ${service.status}`
              : "Unavailable",
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
      const ids = Array.isArray(workspace.deviceIds) ? workspace.deviceIds : [];

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
            name: device?.deviceName || "Unavailable device",
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

  const serviceIds = useMemo(
    () => workspace?.serviceIds || [],
    [workspace]
  );
  const deviceIds = useMemo(
    () => workspace?.deviceIds || [],
    [workspace]
  );

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

  const emptyWorkspace = workspace.emptyWorkspace
    || (serviceIds.length === 0 && deviceIds.length === 0);
  const hasPartialFailure = Boolean(serviceError || deviceError);
  const hasPartialSuccess = [...serviceDetails, ...deviceDetails]
    .some(item => item.unavailable);

  return (
    <DashboardLayout>
      <section className="project-workspace-page">
        <PageHero
          eyebrow="Project Observability"
          title={workspace.projectName}
          description={workspace.projectDescription || "No project description provided."}
          action={<StatusBadge variant={workspace.projectStatus}>{workspace.projectStatus}</StatusBadge>}
        />

        <WorkspaceNav />

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
              items={serviceDetails}
              emptyMessage="No active service associations yet."
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
              items={deviceDetails}
              emptyMessage="No active device associations yet."
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
