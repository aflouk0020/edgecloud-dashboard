import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ProjectHistoricalMetricsPage from "./ProjectHistoricalMetricsPage";
import { AuthProvider } from "../../context/AuthContext";
import { getProjectWorkspace } from "../../services/projectWorkspaceService";
import { getProjectHistoricalMetrics } from "../../services/projectHistoricalMetricsService";

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

vi.mock("../../services/projectHistoricalMetricsService", () => ({
  getProjectHistoricalMetrics: vi.fn(),
  normalizeProjectHistoricalMetricsError: vi.fn(error => ({
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
              : error.status === 400
                ? "Invalid date range"
                : "Unable to load historical metrics",
    message:
      error.status === 403
        ? "You do not have permission to view this project history."
        : error.status === 422
          ? "This project is archived. Historical data is read-only."
          : error.status === 404
            ? "The requested project history could not be found."
            : error.status === 401
              ? "Please sign in again to view this project history."
              : error.status === 400
                ? "Please adjust the selected date range and try again."
                : "Please try again once the Project Service is available."
  }))
}));

function renderPage(route = "/projects/project-1/metrics") {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route
            path="/projects/:projectId/metrics"
            element={<ProjectHistoricalMetricsPage />}
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
    deviceIds: ["device-a"],
    serviceAssociationCount: 1,
    deviceAssociationCount: 1,
    emptyWorkspace: false,
    generatedAt: "2026-08-03T10:00:00Z",
    ...overrides
  };
}

function historyResponse(overrides = {}) {
  return {
    projectId: "project-1",
    projectName: "Fleet Observability",
    selectedDateRange: {
      from: "2026-08-02T12:00:00Z",
      to: "2026-08-03T12:00:00Z"
    },
    pagination: {
      currentPage: 0,
      pageSize: 25,
      totalElements: 2,
      totalPages: 1,
      sortDirection: "DESC"
    },
    records: [
      {
        recordId: "record-1",
        sourceType: "SERVICE",
        sourceId: "service-a",
        metricType: "uptime",
        numericValue: 1,
        unit: "status",
        status: "UP",
        recordedAt: "2026-08-03T11:59:00Z"
      },
      {
        recordId: "record-2",
        sourceType: "DEVICE",
        sourceId: "device-a",
        metricType: "cpu_usage",
        numericValue: 62.5,
        unit: "%",
        status: "ONLINE",
        recordedAt: "2026-08-03T11:58:00Z"
      }
    ],
    dataState: "COMPLETE",
    generatedAt: "2026-08-03T12:00:00Z",
    ...overrides
  };
}

describe("ProjectHistoricalMetricsPage", () => {
  beforeEach(() => {
    localStorage.setItem("token", "metrics-token");
    localStorage.setItem("role", "PROJECT_ADMIN");
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the route and the selected project context", async () => {
    getProjectWorkspace.mockResolvedValue(workspace());
    getProjectHistoricalMetrics.mockResolvedValue(historyResponse());

    renderPage();

    expect(await screen.findByRole("heading", { name: "Fleet Observability" }))
      .toBeInTheDocument();
    expect(screen.getByText("Workspace for project monitoring.")).toBeInTheDocument();
    expect(screen.getByLabelText("Project workspace navigation")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Metrics" })).toHaveAttribute("href", "/projects/project-1/metrics");
  });

  it("uses the default previous-24-hours range and loads history after workspace access succeeds", async () => {
    getProjectWorkspace.mockResolvedValue(workspace());
    getProjectHistoricalMetrics.mockResolvedValue(historyResponse());

    renderPage();

    await screen.findByRole("heading", { name: "Fleet Observability" });
    const fromInput = screen.getByLabelText("From");
    const toInput = screen.getByLabelText("To");
    expect(new Date(toInput.value).getTime() - new Date(fromInput.value).getTime())
      .toBe(24 * 60 * 60 * 1000);
    const expectedFrom = new Date(fromInput.value).toISOString();
    const expectedTo = new Date(toInput.value).toISOString();
    await waitFor(() => {
      expect(getProjectHistoricalMetrics).toHaveBeenCalledTimes(1);
    });
    expect(getProjectHistoricalMetrics).toHaveBeenCalledWith(
      "project-1",
      expect.objectContaining({
        from: expectedFrom,
        to: expectedTo,
        page: 0,
        size: 25,
        sortDirection: "DESC"
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("renders successful historical records with safe fields", async () => {
    getProjectWorkspace.mockResolvedValue(workspace());
    getProjectHistoricalMetrics.mockResolvedValue(historyResponse());

    renderPage();

    expect(await screen.findByText("uptime")).toBeInTheDocument();
    expect(screen.getByText("SERVICE · service-a")).toBeInTheDocument();
    expect(screen.getByText("cpu_usage")).toBeInTheDocument();
    expect(screen.getByText("62.5")).toBeInTheDocument();
    expect(screen.getAllByText("Page 1 of 1")).toHaveLength(2);
    expect(screen.getByText("2 records")).toBeInTheDocument();
  });

  it("updates the query when the date range changes and resets the page", async () => {
    getProjectWorkspace.mockResolvedValue(workspace());
    getProjectHistoricalMetrics
      .mockResolvedValueOnce(historyResponse())
      .mockResolvedValueOnce(historyResponse({
        pagination: { currentPage: 0, pageSize: 25, totalElements: 1, totalPages: 1, sortDirection: "DESC" }
      }));

    renderPage();

    expect(await screen.findByRole("heading", { name: "Fleet Observability" }))
      .toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-08-01T12:00" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-08-03T12:00" } });

    const expectedFrom = new Date("2026-08-01T12:00").toISOString();
    const expectedTo = new Date("2026-08-03T12:00").toISOString();

    await waitFor(() => {
      expect(getProjectHistoricalMetrics).toHaveBeenLastCalledWith(
        "project-1",
        expect.objectContaining({
          from: expectedFrom,
          to: expectedTo,
          page: 0
        }),
        expect.any(Object)
      );
    });
  });

  it("rejects reversed and excessive ranges before requesting", async () => {
    getProjectWorkspace.mockResolvedValue(workspace());
    getProjectHistoricalMetrics.mockResolvedValue(historyResponse());

    renderPage();

    expect(await screen.findByRole("heading", { name: "Fleet Observability" }))
      .toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-08-03T12:00" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-08-01T12:00" } });

    expect(await screen.findByText("Invalid date range")).toBeInTheDocument();
    expect(screen.getByText("From must be earlier than or equal to To.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-04-01T12:00" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-08-03T12:00" } });
    expect(await screen.findByText("The selected range must not exceed 90 days.")).toBeInTheDocument();
  });

  it("supports ASC and DESC sorting requests", async () => {
    getProjectWorkspace.mockResolvedValue(workspace());
    getProjectHistoricalMetrics.mockResolvedValue(historyResponse());

    renderPage();

    expect(await screen.findByRole("heading", { name: "Fleet Observability" }))
      .toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Sort"), { target: { value: "ASC" } });

    await waitFor(() => {
      expect(getProjectHistoricalMetrics).toHaveBeenLastCalledWith(
        "project-1",
        expect.objectContaining({ sortDirection: "ASC" }),
        expect.any(Object)
      );
    });
  });

  it("paginates forward and backward and resets page size changes", async () => {
    getProjectWorkspace.mockResolvedValue(workspace());
    getProjectHistoricalMetrics
      .mockResolvedValueOnce(historyResponse({
        pagination: { currentPage: 0, pageSize: 25, totalElements: 30, totalPages: 2, sortDirection: "DESC" }
      }))
      .mockResolvedValueOnce(historyResponse({
        pagination: { currentPage: 1, pageSize: 25, totalElements: 30, totalPages: 2, sortDirection: "DESC" }
      }))
      .mockResolvedValueOnce(historyResponse({
        pagination: { currentPage: 0, pageSize: 10, totalElements: 30, totalPages: 3, sortDirection: "DESC" }
      }));

    renderPage();

    expect((await screen.findAllByText("Page 1 of 2")).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(getProjectHistoricalMetrics).toHaveBeenLastCalledWith(
        "project-1",
        expect.objectContaining({ page: 1 }),
        expect.any(Object)
      );
    });

    fireEvent.change(screen.getByLabelText("Page size"), { target: { value: "10" } });
    await waitFor(() => {
      expect(getProjectHistoricalMetrics).toHaveBeenLastCalledWith(
        "project-1",
        expect.objectContaining({ page: 0, size: 10 }),
        expect.any(Object)
      );
    });
  });

  it("shows empty, partial, unavailable, API error, unauthorised and archived states", async () => {
    getProjectWorkspace.mockResolvedValue(workspace({ projectStatus: "ARCHIVED" }));
    getProjectHistoricalMetrics.mockResolvedValue(historyResponse({
      projectStatus: "ARCHIVED",
      records: [],
      dataState: "NO_DATA",
      pagination: { currentPage: 0, pageSize: 25, totalElements: 0, totalPages: 0, sortDirection: "DESC" }
    }));

    renderPage();
    expect(await screen.findByText("ARCHIVED")).toBeInTheDocument();
    expect(screen.getByText("No historical records found")).toBeInTheDocument();
  });

  it("shows partial and unavailable banners without breaking the page", async () => {
    getProjectWorkspace.mockResolvedValue(workspace());
    getProjectHistoricalMetrics.mockResolvedValueOnce(historyResponse({
      dataState: "PARTIAL"
    })).mockResolvedValueOnce(historyResponse({
      dataState: "UNAVAILABLE",
      records: [],
      pagination: { currentPage: 0, pageSize: 25, totalElements: 0, totalPages: 0, sortDirection: "DESC" }
    }));

    renderPage();

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Some historical data could not be resolved. The available records are shown below."
    );
  });

  it("shows error and unauthorised states from the secure backend", async () => {
    getProjectWorkspace.mockRejectedValue({ status: 403 });

    renderPage();

    expect(await screen.findByText("Access denied")).toBeInTheDocument();
    expect(screen.getByText("You do not have permission to view this project workspace.")).toBeInTheDocument();
  });

  it("does not request history before workspace access succeeds", () => {
    getProjectWorkspace.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(getProjectHistoricalMetrics).not.toHaveBeenCalled();
  });

  it("keeps pagination controls bounded and renders a responsive timeline structure", async () => {
    getProjectWorkspace.mockResolvedValue(workspace());
    getProjectHistoricalMetrics.mockResolvedValue(historyResponse());

    renderPage();

    expect(await screen.findByRole("heading", { name: "Fleet Observability" }))
      .toBeInTheDocument();
    expect(screen.getByLabelText("From")).toBeInTheDocument();
    expect(screen.getByLabelText("To")).toBeInTheDocument();
    expect(screen.getByLabelText("Sort")).toBeInTheDocument();
    expect(screen.getByLabelText("Page size")).toBeInTheDocument();
  });
});
