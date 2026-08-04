import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProjectWorkspacePage from "./ProjectWorkspacePage";
import { getProjectWorkspace } from "../../services/projectWorkspaceService";
import {
  getMonitoredServicesByIds
} from "../../services/serviceMonitoringService";
import { getDevicesByIds } from "../../services/deviceService";
import {
  getProjectHealthSummary
} from "../../services/projectHealthSummaryService";
import { AuthProvider } from "../../context/AuthContext";

vi.mock("../../services/projectWorkspaceService", () => ({
  getProjectWorkspace: vi.fn(),
  normalizeWorkspaceError: vi.fn(error => ({
    status: error.status,
    title:
      error.status === 403
        ? "Access denied"
        : error.status === 422
          ? "Archived project"
          : "Unable to load workspace",
    message:
      error.status === 403
        ? "You do not have permission to view this project workspace."
        : error.status === 422
          ? "This project is archived. Workspace data is read-only."
          : "Please try again once the Project Service is available."
  }))
}));

vi.mock("../../services/serviceMonitoringService", () => ({
  getMonitoredServicesByIds: vi.fn()
}));

vi.mock("../../services/deviceService", () => ({
  getDevicesByIds: vi.fn()
}));

vi.mock("../../services/projectHealthSummaryService", () => ({
  getProjectHealthSummary: vi.fn(),
  normalizeProjectHealthSummaryError: vi.fn(error => ({
    status: error.status,
    title:
      error.status === 403
        ? "Access denied"
        : error.status === 422
          ? "Archived project"
          : error.status === 404
            ? "Project not found"
            : error.status === 401
              ? "Authentication required"
              : "Unable to load health summary",
    message:
      error.status === 403
        ? "You do not have permission to view this project health summary."
        : error.status === 422
          ? "This project is archived. Health data is read-only."
          : error.status === 404
            ? "The requested project health summary could not be found."
            : error.status === 401
              ? "Please sign in again to view this project health summary."
              : "Please try again once the Project Service is available."
  }))
}));

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function renderWorkspace(route = "/projects/project-1/workspace") {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route
            path="/projects/:projectId/workspace"
            element={<ProjectWorkspacePage />}
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

const baseWorkspace = {
  projectId: "project-1",
  projectName: "Fleet Observability",
  projectDescription: "Workspace for project monitoring.",
  projectStatus: "ACTIVE",
  callerUserId: "user-1",
  callerProjectRole: "PROJECT_ADMIN",
  serviceIds: ["service-a", "service-b"],
  deviceIds: ["device-a", "device-b"],
  serviceAssociationCount: 2,
  deviceAssociationCount: 2,
  emptyWorkspace: false,
  generatedAt: "2026-08-03T10:00:00Z"
};

const serviceDetails = [
  {
    serviceId: "service-a",
    service: {
      id: "service-a",
      serviceName: "monitoring-service",
      serviceUrl: "http://monitoring-service:8082",
      status: "UP",
      createdAt: "2026-07-14T10:00:00Z"
    }
  },
  {
    serviceId: "service-b",
    service: {
      id: "service-b",
      serviceName: "device-service",
      serviceUrl: "http://device-service:8083",
      status: "DOWN",
      createdAt: "2026-07-14T10:05:00Z"
    }
  }
];

const deviceDetails = [
  {
    deviceId: "device-a",
    device: {
      id: "device-a",
      deviceName: "raspberry-pi-01",
      deviceType: "RASPBERRY_PI",
      ipAddress: "192.168.1.11",
      status: "ONLINE",
      registeredAt: "2026-07-14T10:00:00Z",
      lastHeartbeat: "2026-07-14T10:10:00Z"
    }
  },
  {
    deviceId: "device-b",
    device: {
      id: "device-b",
      deviceName: "simulator-01",
      deviceType: "SIMULATED",
      ipAddress: "192.168.1.12",
      status: "OFFLINE",
      registeredAt: "2026-07-14T10:00:00Z",
      lastHeartbeat: "2026-07-14T10:05:00Z"
    }
  }
];

describe("ProjectWorkspacePage", () => {
  beforeEach(() => {
    localStorage.setItem("token", "workspace-token");
    localStorage.setItem("role", "PROJECT_ADMIN");
    vi.clearAllMocks();
  });

  it("renders the workspace route and successful enrichment state", async () => {
    getProjectWorkspace.mockResolvedValue(baseWorkspace);
    getProjectHealthSummary.mockResolvedValue({
      projectId: "project-1",
      projectName: "Fleet Observability",
      projectStatus: "ACTIVE",
      overallHealth: "HEALTHY",
      totalRegisteredDevices: 2,
      onlineDevices: 2,
      offlineDevices: 0,
      activeMonitoringServices: 2,
      latestTelemetryReceivedAt: "2026-08-03T10:12:00Z",
      monitoringStatus: "AVAILABLE",
      generatedAt: "2026-08-03T10:12:00Z",
      dataCompleteness: "COMPLETE"
    });
    getMonitoredServicesByIds.mockResolvedValue(serviceDetails);
    getDevicesByIds.mockResolvedValue(deviceDetails);

    renderWorkspace();

    expect(await screen.findByText("Fleet Observability")).toBeInTheDocument();
    expect(screen.getByText("Workspace for project monitoring."))
      .toBeInTheDocument();
    expect(await screen.findByText("monitoring-service")).toBeInTheDocument();
    expect(await screen.findByText("raspberry-pi-01")).toBeInTheDocument();
    expect(screen.getByText("Status: UP")).toBeInTheDocument();
    expect(await screen.findAllByText(/Heartbeat:/)).toHaveLength(2);
    expect(screen.getByText("Overall Project Health")).toBeInTheDocument();
    expect(screen.getByText("HEALTHY")).toBeInTheDocument();
    expect(screen.getByText("Monitoring Status")).toBeInTheDocument();
    expect(screen.getByText("AVAILABLE")).toBeInTheDocument();
    expect(screen.getByText("Last Telemetry Received")).toBeInTheDocument();
    expect(screen.getByLabelText("Project workspace navigation"))
      .toBeInTheDocument();
    expect(screen.getByText("Observability")).toBeInTheDocument();
    expect(screen.getAllByText("Services").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Devices").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Metrics").length).toBeGreaterThanOrEqual(1);
  });

  it("shows section loading states before enrichment resolves", async () => {
    const serviceDeferred = deferred();
    const deviceDeferred = deferred();

    getProjectWorkspace.mockResolvedValue(baseWorkspace);
    getMonitoredServicesByIds.mockReturnValue(serviceDeferred.promise);
    getDevicesByIds.mockReturnValue(deviceDeferred.promise);

    renderWorkspace();

    expect(await screen.findByText("Fleet Observability")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Loading associated services/i))
        .toBeInTheDocument();
      expect(screen.getByText(/Loading associated devices/i))
        .toBeInTheDocument();
    });
  });

  it("shows an empty workspace state", async () => {
    getProjectWorkspace.mockResolvedValue({
      ...baseWorkspace,
      serviceIds: [],
      deviceIds: [],
      serviceAssociationCount: 0,
      deviceAssociationCount: 0,
      emptyWorkspace: true
    });
    getProjectHealthSummary.mockResolvedValue({
      projectId: "project-1",
      projectName: "Fleet Observability",
      projectStatus: "ACTIVE",
      overallHealth: "UNKNOWN",
      totalRegisteredDevices: 0,
      onlineDevices: 0,
      offlineDevices: 0,
      activeMonitoringServices: 0,
      latestTelemetryReceivedAt: null,
      monitoringStatus: "UNAVAILABLE",
      generatedAt: "2026-08-03T10:12:00Z",
      dataCompleteness: "NO_DATA"
    });

    renderWorkspace();

    expect(await screen.findByText("Empty workspace")).toBeInTheDocument();
    expect(screen.getByText("This project does not yet have associated services or devices."))
      .toBeInTheDocument();
    expect(getMonitoredServicesByIds).not.toHaveBeenCalled();
    expect(getDevicesByIds).not.toHaveBeenCalled();
  });

  it("shows health summary loading and refreshing states", async () => {
    const deferredHealth = deferred();

    getProjectWorkspace.mockResolvedValue(baseWorkspace);
    getProjectHealthSummary.mockReturnValue(deferredHealth.promise);
    getMonitoredServicesByIds.mockResolvedValue(serviceDetails);
    getDevicesByIds.mockResolvedValue(deviceDetails);

    renderWorkspace();

    expect(await screen.findByText("Fleet Observability")).toBeInTheDocument();
    expect(await screen.findByText("Loading project health summary..."))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh Health" }))
      .toBeInTheDocument();
  });

  it("shows an empty service section when no services are linked", async () => {
    getProjectWorkspace.mockResolvedValue({
      ...baseWorkspace,
      serviceIds: [],
      serviceAssociationCount: 0
    });
    getDevicesByIds.mockResolvedValue(deviceDetails);

    renderWorkspace();

    expect(await screen.findByText("No active service associations yet."))
      .toBeInTheDocument();
    await waitFor(() => {
      expect(getDevicesByIds).toHaveBeenCalled();
    });
  });

  it("shows an empty device section when no devices are linked", async () => {
    getProjectWorkspace.mockResolvedValue({
      ...baseWorkspace,
      deviceIds: [],
      deviceAssociationCount: 0
    });
    getMonitoredServicesByIds.mockResolvedValue(serviceDetails);

    renderWorkspace();

    expect(await screen.findByText("No active device associations yet."))
      .toBeInTheDocument();
    expect(await screen.findByText("monitoring-service")).toBeInTheDocument();
  });

  it("shows archived project state without blocking the workspace", async () => {
    getProjectWorkspace.mockResolvedValue({
      ...baseWorkspace,
      projectStatus: "ARCHIVED"
    });
    getProjectHealthSummary.mockResolvedValue({
      projectId: "project-1",
      projectName: "Fleet Observability",
      projectStatus: "ARCHIVED",
      overallHealth: "UNKNOWN",
      totalRegisteredDevices: 2,
      onlineDevices: 0,
      offlineDevices: 0,
      activeMonitoringServices: 0,
      latestTelemetryReceivedAt: null,
      monitoringStatus: "UNAVAILABLE",
      generatedAt: "2026-08-03T10:12:00Z",
      dataCompleteness: "NO_DATA"
    });
    getMonitoredServicesByIds.mockResolvedValue(serviceDetails);
    getDevicesByIds.mockResolvedValue(deviceDetails);

    renderWorkspace();

    expect(await screen.findByText("ARCHIVED")).toBeInTheDocument();
    expect(screen.getByText("Fleet Observability")).toBeInTheDocument();
  });

  it("shows API error state", async () => {
    getProjectWorkspace.mockRejectedValue({ status: 500 });

    renderWorkspace();

    expect(await screen.findByText("Unable to load workspace")).toBeInTheDocument();
    expect(getMonitoredServicesByIds).not.toHaveBeenCalled();
    expect(getDevicesByIds).not.toHaveBeenCalled();
  });

  it("shows unauthorised state for 403 responses", async () => {
    getProjectWorkspace.mockRejectedValue({ status: 403 });

    renderWorkspace();

    expect(await screen.findByText("Access denied")).toBeInTheDocument();
    expect(screen.getByText("You do not have permission to view this project workspace."))
      .toBeInTheDocument();
  });

  it("renders unavailable items without breaking the page", async () => {
    getProjectWorkspace.mockResolvedValue(baseWorkspace);
    getProjectHealthSummary.mockResolvedValue({
      projectId: "project-1",
      projectName: "Fleet Observability",
      projectStatus: "ACTIVE",
      overallHealth: "DEGRADED",
      totalRegisteredDevices: 2,
      onlineDevices: 1,
      offlineDevices: 1,
      activeMonitoringServices: 1,
      latestTelemetryReceivedAt: null,
      monitoringStatus: "PARTIAL",
      generatedAt: "2026-08-03T10:12:00Z",
      dataCompleteness: "PARTIAL"
    });
    getMonitoredServicesByIds.mockResolvedValue([
      serviceDetails[0],
      { serviceId: "service-b", service: null }
    ]);
    getDevicesByIds.mockResolvedValue([
      deviceDetails[0],
      { deviceId: "device-b", device: null }
    ]);

    renderWorkspace();

    expect(await screen.findByText("Unavailable service")).toBeInTheDocument();
    expect(screen.getByText("Unavailable device")).toBeInTheDocument();
    expect(screen.getByText("Some linked resources were found, while others are shown by identifier only."))
      .toBeInTheDocument();
  });

  it("requests only workspace-returned identifiers", async () => {
    getProjectWorkspace.mockResolvedValue({
      ...baseWorkspace,
      serviceIds: ["service-b", "service-a"],
      deviceIds: ["device-b"]
    });
    getProjectHealthSummary.mockResolvedValue({
      ...baseWorkspace,
      overallHealth: "UNKNOWN",
      totalRegisteredDevices: 1,
      onlineDevices: 0,
      offlineDevices: 0,
      activeMonitoringServices: 0,
      latestTelemetryReceivedAt: null,
      monitoringStatus: "UNAVAILABLE",
      generatedAt: "2026-08-03T10:12:00Z",
      dataCompleteness: "NO_DATA"
    });
    getMonitoredServicesByIds.mockResolvedValue(serviceDetails);
    getDevicesByIds.mockResolvedValue(deviceDetails);

    renderWorkspace();

    await screen.findByText("Fleet Observability");

    await waitFor(() => {
      expect(getMonitoredServicesByIds).toHaveBeenCalledWith([
        "service-b",
        "service-a"
      ]);
      expect(getDevicesByIds).toHaveBeenCalledWith(["device-b"]);
    });
  });

  it("does not enrich before workspace access succeeds", () => {
    getProjectWorkspace.mockReturnValue(new Promise(() => {}));

    renderWorkspace();

    expect(getMonitoredServicesByIds).not.toHaveBeenCalled();
    expect(getDevicesByIds).not.toHaveBeenCalled();
    expect(screen.getByText("Loading project workspace..."))
      .toBeInTheDocument();
  });

  it("shows unavailable telemetry fallback when timestamp is missing", async () => {
    getProjectWorkspace.mockResolvedValue(baseWorkspace);
    getProjectHealthSummary.mockResolvedValue({
      projectId: "project-1",
      projectName: "Fleet Observability",
      projectStatus: "ACTIVE",
      overallHealth: "UNKNOWN",
      totalRegisteredDevices: 2,
      onlineDevices: 1,
      offlineDevices: 1,
      activeMonitoringServices: 1,
      latestTelemetryReceivedAt: null,
      monitoringStatus: "PARTIAL",
      generatedAt: "2026-08-03T10:12:00Z",
      dataCompleteness: "PARTIAL"
    });
    getMonitoredServicesByIds.mockResolvedValue(serviceDetails);
    getDevicesByIds.mockResolvedValue(deviceDetails);

    renderWorkspace();

    expect(await screen.findByText("No telemetry timestamp available yet"))
      .toBeInTheDocument();
  });

  it("refreshes the health summary manually", async () => {
    getProjectWorkspace.mockResolvedValue(baseWorkspace);
    getProjectHealthSummary
      .mockResolvedValueOnce({
        ...baseWorkspace,
        overallHealth: "UNKNOWN",
        totalRegisteredDevices: 2,
        onlineDevices: 1,
        offlineDevices: 1,
        activeMonitoringServices: 1,
        latestTelemetryReceivedAt: null,
        monitoringStatus: "PARTIAL",
        generatedAt: "2026-08-03T10:12:00Z",
        dataCompleteness: "PARTIAL"
      })
      .mockResolvedValueOnce({
        ...baseWorkspace,
        overallHealth: "HEALTHY",
        totalRegisteredDevices: 2,
        onlineDevices: 2,
        offlineDevices: 0,
        activeMonitoringServices: 2,
        latestTelemetryReceivedAt: "2026-08-03T10:15:00Z",
        monitoringStatus: "AVAILABLE",
        generatedAt: "2026-08-03T10:15:00Z",
        dataCompleteness: "COMPLETE"
      })
      .mockResolvedValueOnce({
        ...baseWorkspace,
        overallHealth: "HEALTHY",
        totalRegisteredDevices: 2,
        onlineDevices: 2,
        offlineDevices: 0,
        activeMonitoringServices: 2,
        latestTelemetryReceivedAt: "2026-08-03T10:15:00Z",
        monitoringStatus: "AVAILABLE",
        generatedAt: "2026-08-03T10:15:00Z",
        dataCompleteness: "COMPLETE"
      });
    getMonitoredServicesByIds.mockResolvedValue(serviceDetails);
    getDevicesByIds.mockResolvedValue(deviceDetails);

    renderWorkspace();

    expect(await screen.findByText("UNKNOWN")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh Health" }));
    await waitFor(() => {
      expect(getProjectHealthSummary).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText("HEALTHY")).toBeInTheDocument();
  });

  it("sets up automatic refresh cleanup without leaking requests", async () => {
    getProjectWorkspace.mockResolvedValue(baseWorkspace);
    getProjectHealthSummary.mockResolvedValue({
      ...baseWorkspace,
      overallHealth: "UNKNOWN",
      totalRegisteredDevices: 2,
      onlineDevices: 1,
      offlineDevices: 1,
      activeMonitoringServices: 1,
      latestTelemetryReceivedAt: null,
      monitoringStatus: "PARTIAL",
      generatedAt: "2026-08-03T10:12:00Z",
      dataCompleteness: "PARTIAL"
    });
    getMonitoredServicesByIds.mockResolvedValue(serviceDetails);
    getDevicesByIds.mockResolvedValue(deviceDetails);

    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");
    const { unmount } = renderWorkspace();

    expect(await screen.findByText("UNKNOWN")).toBeInTheDocument();
    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it("keeps health requests out until workspace access succeeds", () => {
    getProjectWorkspace.mockReturnValue(new Promise(() => {}));

    renderWorkspace();

    expect(getProjectHealthSummary).not.toHaveBeenCalled();
  });

  it("keeps partial-success states isolated per section", async () => {
    getProjectWorkspace.mockResolvedValue(baseWorkspace);
    getProjectHealthSummary.mockResolvedValue({
      projectId: "project-1",
      projectName: "Fleet Observability",
      projectStatus: "ACTIVE",
      overallHealth: "DEGRADED",
      totalRegisteredDevices: 2,
      onlineDevices: 1,
      offlineDevices: 1,
      activeMonitoringServices: 1,
      latestTelemetryReceivedAt: null,
      monitoringStatus: "PARTIAL",
      generatedAt: "2026-08-03T10:12:00Z",
      dataCompleteness: "PARTIAL"
    });
    getMonitoredServicesByIds.mockResolvedValue(serviceDetails);
    getDevicesByIds.mockRejectedValue(new Error("device lookup failed"));

    renderWorkspace();

    expect(await screen.findByText("Fleet Observability")).toBeInTheDocument();
    expect(await screen.findByText("monitoring-service")).toBeInTheDocument();
    expect(screen.getByText("Associated devices unavailable"))
      .toBeInTheDocument();
  });
});
