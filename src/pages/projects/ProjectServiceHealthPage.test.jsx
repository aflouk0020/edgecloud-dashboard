import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "../../context/AuthContext";
import ProjectServiceHealthPage from "./ProjectServiceHealthPage";
import { getProjectWorkspace } from "../../services/projectWorkspaceService";
import { getProjectServiceHealth } from "../../services/projectServiceHealthService";

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

vi.mock("../../services/projectServiceHealthService", () => ({
  getProjectServiceHealth: vi.fn(),
  normalizeProjectServiceHealthError: vi.fn(error => ({
    status: error.status,
    title:
      error.status === 403
        ? "Access denied"
        : error.status === 422
          ? "Archived project"
          : error.status === 401
            ? "Authentication required"
            : error.status === 404
              ? "Project not found"
              : "Unable to load service overview",
    message:
      error.status === 403
        ? "You do not have permission to view this project service overview."
        : error.status === 422
          ? "This project is archived. Service health is read-only."
          : error.status === 401
            ? "Please sign in again to view this project service overview."
            : error.status === 404
              ? "The requested project service overview could not be found."
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

function renderPage(route = "/projects/project-1/services") {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route
            path="/projects/:projectId/services"
            element={<ProjectServiceHealthPage />}
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
    serviceIds: ["service-b", "service-a", "service-c"],
    deviceIds: ["device-a"],
    serviceAssociationCount: 3,
    deviceAssociationCount: 1,
    emptyWorkspace: false,
    generatedAt: "2026-08-03T10:00:00Z",
    ...overrides
  };
}

function healthSummary(overrides = {}) {
  return {
    projectId: "project-1",
    generatedAt: "2026-08-03T11:00:00Z",
    totalServices: 3,
    healthyCount: 1,
    degradedCount: 1,
    unavailableCount: 1,
    unknownCount: 0,
    dataCompleteness: "COMPLETE",
    services: [
      {
        serviceId: "service-b",
        serviceName: "alpha-service",
        serviceUrl: "http://alpha:8080",
        currentHealthStatus: "HEALTHY",
        availabilityPercentage: 99,
        latestMonitoringTimestamp: "2026-08-03T10:58:00Z",
        averageResponseTime: "12ms",
        lastUpdatedAt: "2026-08-03T10:59:00Z",
        dataState: "COMPLETE"
      },
      {
        serviceId: "service-a",
        serviceName: "api-service",
        serviceUrl: "http://api:8080",
        currentHealthStatus: "DEGRADED",
        availabilityPercentage: 72,
        latestMonitoringTimestamp: "2026-08-03T10:57:00Z",
        averageResponseTime: "150ms",
        lastUpdatedAt: "2026-08-03T10:58:30Z",
        dataState: "PARTIAL"
      },
      {
        serviceId: "service-c",
        serviceName: "api-service",
        serviceUrl: null,
        currentHealthStatus: "UNAVAILABLE",
        availabilityPercentage: null,
        latestMonitoringTimestamp: null,
        averageResponseTime: null,
        lastUpdatedAt: null,
        dataState: "NO_DATA"
      }
    ],
    ...overrides
  };
}

describe("ProjectServiceHealthPage", () => {
  beforeEach(() => {
    localStorage.setItem("token", "service-token");
    localStorage.setItem("role", "PROJECT_ADMIN");
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the route and project context", async () => {
    getProjectWorkspace.mockResolvedValue(workspace());
    getProjectServiceHealth.mockResolvedValue(healthSummary());

    renderPage();

    expect(await screen.findByRole("heading", { name: "Fleet Observability" }))
      .toBeInTheDocument();
    expect(screen.getByText("Workspace for project monitoring.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Services" })).toHaveAttribute(
      "href",
      "/projects/project-1/services"
    );
    expect(screen.getByRole("link", { name: "Observability" })).toHaveAttribute(
      "href",
      "/projects/project-1/workspace"
    );
  });

  it("renders successful overview data with summary counts and safe fields", async () => {
    getProjectWorkspace.mockResolvedValue(workspace());
    getProjectServiceHealth.mockResolvedValue(healthSummary());

    renderPage();

    await waitFor(() => expect(getProjectServiceHealth).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(document.querySelectorAll("tbody tr").length).toBe(3));

    const rows = Array.from(document.querySelectorAll("tbody tr"));
    expect(rows[0]).toHaveTextContent("alpha-service");
    expect(rows[0]).toHaveTextContent("HEALTHY");
    expect(rows[1]).toHaveTextContent("api-service");
    expect(rows[1]).toHaveTextContent("DEGRADED");
    expect(rows[2]).toHaveTextContent("service-c");
    expect(rows[2]).toHaveTextContent("UNAVAILABLE");
    expect(screen.getAllByText("99").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Latest monitoring update").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Average response time").length).toBeGreaterThan(0);
  });

  it("displays summary counts and status badges", async () => {
    getProjectWorkspace.mockResolvedValue(workspace());
    getProjectServiceHealth.mockResolvedValue(healthSummary());

    renderPage();

    expect(await screen.findAllByLabelText("Current health status HEALTHY")).toHaveLength(2);
    expect(screen.getAllByLabelText("Current health status DEGRADED")).toHaveLength(2);
    expect(screen.getAllByLabelText("Current health status UNAVAILABLE")).toHaveLength(2);
    expect(screen.getAllByLabelText("Summary data completeness COMPLETE")).toHaveLength(1);
    expect(screen.getAllByText(/Generated at/).length).toBeGreaterThan(0);

    expect(screen.getByText("Total services")).toBeInTheDocument();
    expect(screen.getByText("Healthy")).toBeInTheDocument();
    expect(screen.getByText("Degraded")).toBeInTheDocument();
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("supports ascending and descending service-name sorting with ID fallback", async () => {
    getProjectWorkspace.mockResolvedValue(workspace());
    getProjectServiceHealth.mockResolvedValue(healthSummary());

    renderPage();

    await screen.findByRole("table");

    const rows = () => Array.from(document.querySelectorAll(".project-service-health-table tbody tr"));
    expect(rows()[0]).toHaveTextContent("alpha-service");
    expect(rows()[1]).toHaveTextContent("api-service");
    expect(rows()[1]).toHaveTextContent("service-a");
    expect(rows()[2]).toHaveTextContent("service-c");

    fireEvent.change(screen.getByLabelText("Sort direction"), {
      target: { value: "DESC" }
    });

    await waitFor(() => {
      expect(rows()[0]).toHaveTextContent("api-service");
      expect(rows()[0]).toHaveTextContent("service-a");
      expect(rows()[1]).toHaveTextContent("service-c");
      expect(rows()[2]).toHaveTextContent("alpha-service");
    });
  });

  it("shows empty, partial, unavailable and NO_DATA states", async () => {
    getProjectWorkspace.mockResolvedValue(workspace());
    getProjectServiceHealth.mockResolvedValue(healthSummary({
      totalServices: 0,
      healthyCount: 0,
      degradedCount: 0,
      unavailableCount: 0,
      unknownCount: 0,
      dataCompleteness: "NO_DATA",
      services: []
    }));

    renderPage();

    expect(await screen.findByRole("heading", { name: "No active services" })).toBeInTheDocument();
    expect(screen.getByText("This project does not yet have associated services.")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Summary data completeness NO_DATA")).toHaveLength(1);
  });

  it("shows unavailable individual service and PARTIAL state", async () => {
    getProjectWorkspace.mockResolvedValue(workspace());
    getProjectServiceHealth.mockResolvedValue(healthSummary({
      dataCompleteness: "PARTIAL",
      services: [
        {
          serviceId: "service-z",
          serviceName: "zeta-service",
          serviceUrl: null,
          currentHealthStatus: "UNAVAILABLE",
          availabilityPercentage: null,
          latestMonitoringTimestamp: null,
          averageResponseTime: null,
          lastUpdatedAt: null,
          dataState: "NO_DATA"
        }
      ]
    }));

    renderPage();

    expect(await screen.findByLabelText("Summary data completeness PARTIAL")).toBeInTheDocument();
    expect(screen.getAllByText("zeta-service").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Current health status UNAVAILABLE")).toHaveLength(2);
    expect(screen.getAllByLabelText("Service data state NO_DATA")).toHaveLength(2);
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

  it("shows a service API error without breaking the workspace shell", async () => {
    getProjectWorkspace.mockResolvedValue(workspace());
    getProjectServiceHealth.mockRejectedValue({ status: 500 });

    renderPage();

    expect(await screen.findByText("Unable to load service overview")).toBeInTheDocument();
    expect(screen.getByText("Please try again once the Project Service is available."))
      .toBeInTheDocument();
  });

  it("shows archived project state and missing JWT behaviour from secured backend", async () => {
    getProjectWorkspace.mockResolvedValue(workspace({ projectStatus: "ARCHIVED" }));
    getProjectServiceHealth.mockResolvedValue(healthSummary({
      dataCompleteness: "NO_DATA",
      services: []
    }));

    renderPage();

    expect(await screen.findByLabelText("Project status ARCHIVED")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Summary data completeness NO_DATA")).toHaveLength(1);
  });

  it("refreshes manually and cleans up the automatic refresh interval", async () => {
    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");

    getProjectWorkspace.mockResolvedValue(workspace());
    getProjectServiceHealth
      .mockResolvedValueOnce(healthSummary())
      .mockResolvedValueOnce(healthSummary({
        generatedAt: "2026-08-03T12:00:00Z"
      }));

    const { unmount } = renderPage();

    await waitFor(() => expect(getProjectServiceHealth).toHaveBeenCalledTimes(1));
    const refreshButton = screen.getByRole("button", { name: "Refresh Services" });
    expect(refreshButton).toBeInTheDocument();

    fireEvent.click(refreshButton);
    await waitFor(() => expect(getProjectServiceHealth).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getAllByText(/Generated at/).length).toBeGreaterThan(0));

    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it("does not schedule duplicate refresh requests while one is in flight", async () => {
    const refreshDeferred = deferred();

    getProjectWorkspace.mockResolvedValue(workspace());
    getProjectServiceHealth
      .mockResolvedValueOnce(healthSummary())
      .mockReturnValueOnce(refreshDeferred.promise);

    renderPage();

    await waitFor(() => expect(getProjectServiceHealth).toHaveBeenCalledTimes(1));
    const refreshButton = await screen.findByRole("button", { name: "Refresh Services" });
    fireEvent.click(refreshButton);
    fireEvent.click(refreshButton);

    await waitFor(() => expect(getProjectServiceHealth).toHaveBeenCalledTimes(2));
    refreshDeferred.resolve(healthSummary());
    await waitFor(() => expect(screen.getAllByText(/Generated at/).length).toBeGreaterThan(0));
  });

  it("does not request service health before workspace access succeeds", () => {
    getProjectWorkspace.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(getProjectServiceHealth).not.toHaveBeenCalled();
    expect(screen.getByText("Loading project workspace...")).toBeInTheDocument();
  });

  it("renders a responsive table/card structure", async () => {
    getProjectWorkspace.mockResolvedValue(workspace());
    getProjectServiceHealth.mockResolvedValue(healthSummary());

    renderPage();

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(document.querySelector(".project-service-health-card-list")).toBeInTheDocument();
  });
});
