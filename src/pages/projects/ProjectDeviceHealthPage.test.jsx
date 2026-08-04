import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "../../context/AuthContext";
import ProjectDeviceHealthPage from "./ProjectDeviceHealthPage";
import { getProjectWorkspace } from "../../services/projectWorkspaceService";
import { getProjectDeviceHealth } from "../../services/projectDeviceHealthService";

vi.mock("../../services/projectWorkspaceService", () => ({
  getProjectWorkspace: vi.fn(),
  normalizeWorkspaceError: vi.fn(error => ({
    status: error.status,
    title:
      error.status === 403
        ? "Access denied"
        : error.status === 422
          ? "Archived project"
          : error.status === 401
            ? "Authentication required"
            : "Unable to load workspace",
    message:
      error.status === 403
        ? "You do not have permission to view this project workspace."
        : error.status === 422
          ? "This project is archived. Workspace data is read-only."
          : error.status === 401
            ? "Please sign in again to view this project workspace."
            : "Please try again once the Project Service is available."
  }))
}));

vi.mock("../../services/projectDeviceHealthService", () => ({
  getProjectDeviceHealth: vi.fn(),
  normalizeProjectDeviceHealthError: vi.fn(error => ({
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
              : "Unable to load device overview",
    message:
      error.status === 403
        ? "You do not have permission to view this project device overview."
        : error.status === 422
          ? "This project is archived. Device health is read-only."
          : error.status === 404
            ? "The requested project device overview could not be found."
            : error.status === 401
              ? "Please sign in again to view this project device overview."
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

function renderPage(route = "/projects/project-1/devices") {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route
            path="/projects/:projectId/devices"
            element={<ProjectDeviceHealthPage />}
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

function workspace(overrides = {}) {
  return {
    projectId: "project-1",
    projectName: "Fleet Observability",
    projectDescription: "Workspace for project monitoring.",
    projectStatus: "ACTIVE",
    callerUserId: "user-1",
    callerProjectRole: "PROJECT_ADMIN",
    serviceIds: ["service-a"],
    deviceIds: ["device-b", "device-a", "device-c"],
    serviceAssociationCount: 1,
    deviceAssociationCount: 3,
    emptyWorkspace: false,
    generatedAt: "2026-08-03T10:00:00Z",
    ...overrides
  };
}

function healthSummary(overrides = {}) {
  return {
    projectId: "project-1",
    generatedAt: "2026-08-03T11:00:00Z",
    totalDevices: 3,
    onlineCount: 1,
    offlineCount: 1,
    degradedCount: 1,
    unavailableCount: 0,
    unknownCount: 0,
    dataCompleteness: "COMPLETE",
    devices: [
      {
        deviceId: "device-b",
        deviceName: "Alpha Node",
        deviceType: "RASPBERRY_PI",
        ipAddress: "192.168.1.12",
        currentStatus: "ONLINE",
        healthStatus: "HEALTHY",
        availability: 99,
        latestHeartbeat: "2026-08-03T10:58:00Z",
        latestTelemetryReceivedAt: "2026-08-03T10:58:30Z",
        lastUpdatedAt: "2026-08-03T10:59:00Z",
        dataState: "COMPLETE"
      },
      {
        deviceId: "device-a",
        deviceName: "edge node",
        deviceType: "SIMULATED",
        ipAddress: "192.168.1.11",
        currentStatus: "DEGRADED",
        healthStatus: "DEGRADED",
        availability: 78,
        latestHeartbeat: "2026-08-03T10:57:00Z",
        latestTelemetryReceivedAt: "2026-08-03T10:57:30Z",
        lastUpdatedAt: "2026-08-03T10:58:30Z",
        dataState: "PARTIAL"
      },
      {
        deviceId: "device-c",
        deviceName: "edge node",
        deviceType: "IOT",
        ipAddress: null,
        currentStatus: "OFFLINE",
        healthStatus: "OFFLINE",
        availability: 0,
        latestHeartbeat: null,
        latestTelemetryReceivedAt: null,
        lastUpdatedAt: null,
        dataState: "NO_DATA"
      }
    ],
    ...overrides
  };
}

describe("ProjectDeviceHealthPage", () => {
  beforeEach(() => {
    localStorage.setItem("token", "device-token");
    localStorage.setItem("role", "PROJECT_ADMIN");
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the route and project context", async () => {
    getProjectWorkspace.mockResolvedValue(workspace());
    getProjectDeviceHealth.mockResolvedValue(healthSummary());

    renderPage();

    expect(await screen.findByRole("heading", { name: "Fleet Observability" }))
      .toBeInTheDocument();
    expect(screen.getByText("Workspace for project monitoring.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Devices" })).toHaveAttribute(
      "href",
      "/projects/project-1/devices"
    );
    expect(screen.getByRole("link", { name: "Observability" })).toHaveAttribute(
      "href",
      "/projects/project-1/workspace"
    );
  });

  it("renders successful overview data with summary counts and safe fields", async () => {
    getProjectWorkspace.mockResolvedValue(workspace());
    getProjectDeviceHealth.mockResolvedValue(healthSummary());

    renderPage();

    await waitFor(() => expect(getProjectDeviceHealth).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(document.querySelectorAll("tbody tr").length).toBe(3));

    const rows = Array.from(document.querySelectorAll("tbody tr"));
    expect(rows[0]).toHaveTextContent("Alpha Node");
    expect(rows[0]).toHaveTextContent("HEALTHY");
    expect(rows[1]).toHaveTextContent("edge node");
    expect(rows[1]).toHaveTextContent("DEGRADED");
    expect(rows[2]).toHaveTextContent("device-c");
    expect(rows[2]).toHaveTextContent("OFFLINE");
    expect(screen.getAllByText("Latest heartbeat").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Latest telemetry received").length).toBeGreaterThan(0);
  });

  it("displays summary counts and status badges", async () => {
    getProjectWorkspace.mockResolvedValue(workspace());
    getProjectDeviceHealth.mockResolvedValue(healthSummary());

    renderPage();

    expect(await screen.findAllByLabelText("Current health status HEALTHY")).toHaveLength(2);
    expect(screen.getAllByLabelText("Current health status DEGRADED")).toHaveLength(2);
    expect(screen.getAllByLabelText("Current health status OFFLINE")).toHaveLength(2);
    expect(screen.getAllByLabelText("Summary data completeness COMPLETE")).toHaveLength(1);
    expect(screen.getByText("Total devices")).toBeInTheDocument();
    expect(screen.getByText("Online")).toBeInTheDocument();
    expect(screen.getByText("Offline")).toBeInTheDocument();
    expect(screen.getByText("Degraded")).toBeInTheDocument();
    expect(screen.getByText("Data completeness")).toBeInTheDocument();
    expect(screen.getByLabelText("Summary data completeness COMPLETE")).toBeInTheDocument();
  });

  it("supports ascending and descending device-name sorting with ID fallback", async () => {
    getProjectWorkspace.mockResolvedValue(workspace());
    getProjectDeviceHealth.mockResolvedValue(healthSummary());

    renderPage();

    await screen.findByRole("table");
    const rows = () => Array.from(document.querySelectorAll(".project-device-health-table tbody tr"));
    expect(rows()[0]).toHaveTextContent("Alpha Node");
    expect(rows()[1]).toHaveTextContent("edge node");
    expect(rows()[1]).toHaveTextContent("device-a");
    expect(rows()[2]).toHaveTextContent("edge node");
    expect(rows()[2]).toHaveTextContent("device-c");

    fireEvent.change(screen.getByLabelText("Sort direction"), {
      target: { value: "DESC" }
    });

    await waitFor(() => {
      expect(rows()[0]).toHaveTextContent("edge node");
      expect(rows()[0]).toHaveTextContent("device-a");
      expect(rows()[1]).toHaveTextContent("edge node");
      expect(rows()[1]).toHaveTextContent("device-c");
      expect(rows()[2]).toHaveTextContent("Alpha Node");
    });
  });

  it("shows empty, partial, unavailable and NO_DATA states", async () => {
    getProjectWorkspace.mockResolvedValue(workspace());
    getProjectDeviceHealth.mockResolvedValue(healthSummary({
      totalDevices: 0,
      onlineCount: 0,
      offlineCount: 0,
      degradedCount: 0,
      unavailableCount: 0,
      unknownCount: 0,
      dataCompleteness: "NO_DATA",
      devices: []
    }));

    renderPage();

    expect(await screen.findByRole("heading", { name: "No active devices" })).toBeInTheDocument();
    expect(screen.getByText("This project does not yet have associated devices.")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Summary data completeness NO_DATA")).toHaveLength(1);
  });

  it("shows unavailable individual device and PARTIAL state", async () => {
    getProjectWorkspace.mockResolvedValue(workspace());
    getProjectDeviceHealth.mockResolvedValue(healthSummary({
      dataCompleteness: "PARTIAL",
      devices: [
        {
          deviceId: "device-z",
          deviceName: "zeta-node",
          deviceType: "SIMULATED",
          ipAddress: null,
          currentStatus: "UNAVAILABLE",
          healthStatus: "UNAVAILABLE",
          availability: null,
          latestHeartbeat: null,
          latestTelemetryReceivedAt: null,
          lastUpdatedAt: null,
          dataState: "NO_DATA"
        }
      ]
    }));

    renderPage();

    expect(await screen.findByLabelText("Summary data completeness PARTIAL")).toBeInTheDocument();
    expect(screen.getAllByText("zeta-node").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Current health status UNAVAILABLE")).toHaveLength(2);
    expect(screen.getAllByLabelText("Device data state NO_DATA")).toHaveLength(2);
  });

  it("shows API error and unauthorised states", async () => {
    getProjectWorkspace.mockRejectedValue({ status: 403 });

    renderPage();

    expect(await screen.findByText("Access denied")).toBeInTheDocument();
    expect(screen.getByText("You do not have permission to view this project workspace."))
      .toBeInTheDocument();
  });

  it("shows authentication required for a missing or invalid JWT", async () => {
    getProjectWorkspace.mockRejectedValue({ status: 401 });

    renderPage();

    expect(await screen.findByText("Authentication required")).toBeInTheDocument();
    expect(screen.getByText("Please sign in again to view this project workspace."))
      .toBeInTheDocument();
  });

  it("shows a device API error without breaking the workspace shell", async () => {
    getProjectWorkspace.mockResolvedValue(workspace());
    getProjectDeviceHealth.mockRejectedValue({ status: 500 });

    renderPage();

    expect(await screen.findByText("Unable to load device overview")).toBeInTheDocument();
    expect(screen.getByText("Please try again once the Project Service is available."))
      .toBeInTheDocument();
  });

  it("shows archived project state", async () => {
    getProjectWorkspace.mockResolvedValue(workspace({ projectStatus: "ARCHIVED" }));
    getProjectDeviceHealth.mockResolvedValue(healthSummary({
      dataCompleteness: "NO_DATA",
      devices: []
    }));

    renderPage();

    expect(await screen.findByLabelText("Project status ARCHIVED")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Summary data completeness NO_DATA")).toHaveLength(1);
  });

  it("refreshes manually and cleans up the automatic refresh interval", async () => {
    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");

    getProjectWorkspace.mockResolvedValue(workspace());
    getProjectDeviceHealth
      .mockResolvedValueOnce(healthSummary())
      .mockResolvedValueOnce(healthSummary({
        generatedAt: "2026-08-03T12:00:00Z"
      }));

    const { unmount } = renderPage();

    await waitFor(() => expect(getProjectDeviceHealth).toHaveBeenCalledTimes(1));
    const refreshButton = screen.getByRole("button", { name: "Refresh Devices" });
    expect(refreshButton).toBeInTheDocument();

    fireEvent.click(refreshButton);
    await waitFor(() => expect(getProjectDeviceHealth).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getAllByText(/Generated at/).length).toBeGreaterThan(0));

    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it("does not schedule duplicate refresh requests while one is in flight", async () => {
    const refreshDeferred = deferred();

    getProjectWorkspace.mockResolvedValue(workspace());
    getProjectDeviceHealth
      .mockResolvedValueOnce(healthSummary())
      .mockReturnValueOnce(refreshDeferred.promise);

    renderPage();

    await waitFor(() => expect(getProjectDeviceHealth).toHaveBeenCalledTimes(1));
    const refreshButton = await screen.findByRole("button", { name: "Refresh Devices" });
    fireEvent.click(refreshButton);
    fireEvent.click(refreshButton);

    await waitFor(() => expect(getProjectDeviceHealth).toHaveBeenCalledTimes(2));
    refreshDeferred.resolve(healthSummary());
    await waitFor(() => expect(screen.getAllByText(/Generated at/).length).toBeGreaterThan(0));
  });

  it("does not request device health before workspace access succeeds", () => {
    getProjectWorkspace.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(getProjectDeviceHealth).not.toHaveBeenCalled();
    expect(screen.getByText("Loading project workspace...")).toBeInTheDocument();
  });

  it("renders a responsive table/card structure", async () => {
    getProjectWorkspace.mockResolvedValue(workspace());
    getProjectDeviceHealth.mockResolvedValue(healthSummary());

    renderPage();

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(document.querySelector(".project-device-health-card-list")).toBeInTheDocument();
  });
});
