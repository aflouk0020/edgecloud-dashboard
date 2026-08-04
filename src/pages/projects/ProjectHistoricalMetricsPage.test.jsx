import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ProjectHistoricalMetricsPage from "./ProjectHistoricalMetricsPage";
import { observabilityRefreshConfig } from "../../config/observabilityRefreshConfig";
import { AuthProvider } from "../../context/AuthContext";
import { CONNECTION_STATE, useObservabilityPolling } from "../../hooks/useObservabilityPolling";
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

const pollingCalls = [];
let refreshSpy;
let pollingStateControls = null;

vi.mock("../../hooks/useObservabilityPolling", async () => {
  const React = await import("react");
  const actual = await vi.importActual("../../hooks/useObservabilityPolling");

  return {
    ...actual,
    useObservabilityPolling: vi.fn((fetcher, options) => {
      const [connectionState, setConnectionState] = React.useState(CONNECTION_STATE.REFRESHING);
      const [lastSuccessfulRefreshAt, setLastSuccessfulRefreshAt] = React.useState("2026-08-03T12:10:00Z");
      const [lastError, setLastError] = React.useState(null);

      React.useEffect(() => {
        pollingCalls.push(options);
        pollingStateControls = {
          setConnectionState,
          setLastSuccessfulRefreshAt,
          setLastError
        };
      }, [options]);

      const refresh = React.useCallback(async () => {
        refreshSpy?.();
        setConnectionState(CONNECTION_STATE.REFRESHING);

        try {
          const result = await fetcher();
          setLastError(null);
          setLastSuccessfulRefreshAt(new Date().toISOString());
          setConnectionState(CONNECTION_STATE.CONNECTED);
          return result;
        } catch (error) {
          setLastError(error);
          const status = error?.status || 0;
          setConnectionState(status === 401 || status === 403 ? CONNECTION_STATE.DISCONNECTED : CONNECTION_STATE.DEGRADED);
          throw error;
        }
      }, [fetcher]);

      return {
        connectionState,
        lastSuccessfulRefreshAt,
        lastError,
        failureCount: 0,
        refresh,
      };
    })
  };
});

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

function setVisibilityState(value) {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => value
  });
}

describe("ProjectHistoricalMetricsPage", () => {
  beforeEach(() => {
    localStorage.setItem("token", "metrics-token");
    localStorage.setItem("role", "PROJECT_ADMIN");
    vi.clearAllMocks();
    pollingCalls.length = 0;
    refreshSpy = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    setVisibilityState("visible");
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
    );
    expect(useObservabilityPolling).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        enabled: true,
        immediate: false,
        intervalMs: observabilityRefreshConfig.historicalRefreshIntervalMs,
        autoRefreshEnabled: true
      })
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
    await waitFor(() => {
      expect(getProjectHistoricalMetrics).toHaveBeenCalledTimes(1);
    });
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-08-01T12:00" } });
    await waitFor(() => {
      expect(getProjectHistoricalMetrics).toHaveBeenCalledTimes(2);
    });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-08-03T12:00" } });
    await waitFor(() => {
      expect(getProjectHistoricalMetrics).toHaveBeenCalledTimes(3);
    });
    expect(screen.getByLabelText("From").value).toBe("2026-08-01T12:00");
    expect(screen.getByLabelText("To").value).toBe("2026-08-03T12:00");
    const expectedFrom = new Date("2026-08-01T12:00").toISOString();
    const expectedTo = new Date("2026-08-03T12:00").toISOString();
    expect(getProjectHistoricalMetrics.mock.calls.at(-1)[1]).toEqual(
      expect.objectContaining({
        from: expectedFrom,
        to: expectedTo,
        page: 0
      })
    );
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
    await waitFor(() => {
      expect(getProjectHistoricalMetrics).toHaveBeenCalledTimes(1);
    });
    fireEvent.change(screen.getByLabelText("Sort"), { target: { value: "ASC" } });

    await waitFor(() => {
      expect(getProjectHistoricalMetrics).toHaveBeenLastCalledWith(
        "project-1",
        expect.objectContaining({ sortDirection: "ASC" })
      );
    });
  });

  it("migrates to the shared historical polling hook with the configured interval", async () => {
    getProjectWorkspace.mockResolvedValue(workspace());
    getProjectHistoricalMetrics.mockResolvedValue(historyResponse());

    renderPage();

    await screen.findByRole("heading", { name: "Fleet Observability" });

    expect(useObservabilityPolling).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        enabled: true,
        immediate: false,
        intervalMs: observabilityRefreshConfig.historicalRefreshIntervalMs,
        autoRefreshEnabled: true
      })
    );
  });

  it("disables automatic polling when page 1+ is selected but keeps manual refresh available", async () => {
    getProjectWorkspace.mockResolvedValue(workspace());
    getProjectHistoricalMetrics
      .mockResolvedValueOnce(historyResponse({
        pagination: { currentPage: 0, pageSize: 25, totalElements: 30, totalPages: 2, sortDirection: "DESC" }
      }))
      .mockResolvedValueOnce(historyResponse({
        pagination: { currentPage: 1, pageSize: 25, totalElements: 30, totalPages: 2, sortDirection: "DESC" }
      }));

    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText((content, element) => element?.textContent === "Page 1 of 2").length)
        .toBeGreaterThan(0);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    });
    await waitFor(() => {
      expect(getProjectHistoricalMetrics).toHaveBeenLastCalledWith(
        "project-1",
        expect.objectContaining({ page: 1 })
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Refresh history" }));
    });
    await waitFor(() => {
      expect(refreshSpy).toHaveBeenCalled();
    });

    const latestCall = useObservabilityPolling.mock.calls.at(-1)?.[1];
    expect(latestCall).toEqual(expect.objectContaining({ autoRefreshEnabled: false }));
  });

  it("preserves filters, pagination and sorting when controls change", async () => {
    getProjectWorkspace.mockResolvedValue(workspace());
    getProjectHistoricalMetrics.mockResolvedValue(historyResponse());

    renderPage();

    await screen.findByRole("heading", { name: "Fleet Observability" });
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Sort"), { target: { value: "ASC" } });
      fireEvent.change(screen.getByLabelText("Page size"), { target: { value: "50" } });
      fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-08-01T12:00" } });
      fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-08-03T12:00" } });
    });

    expect(screen.getByLabelText("Sort").value).toBe("ASC");
    expect(screen.getByLabelText("Page size").value).toBe("50");
    expect(screen.getByLabelText("From").value).toBe("2026-08-01T12:00");
    expect(screen.getByLabelText("To").value).toBe("2026-08-03T12:00");
  });

  it("shows partial banner without breaking the page", async () => {
    getProjectWorkspace.mockResolvedValue(workspace());
    getProjectHistoricalMetrics.mockResolvedValue(historyResponse({
      dataState: "PARTIAL"
    }));

    renderPage();

    expect(await screen.findByText("Some historical data could not be resolved. The available records are shown below."))
      .toBeInTheDocument();
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

    await waitFor(() => {
      expect(getProjectHistoricalMetrics).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(
        screen.getAllByText((content, element) => element?.textContent === "Page 1 of 2")
      ).not.toHaveLength(0);
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(getProjectHistoricalMetrics).toHaveBeenLastCalledWith(
        "project-1",
        expect.objectContaining({ page: 1 })
      );
    });

    fireEvent.change(screen.getByLabelText("Page size"), { target: { value: "10" } });
    await waitFor(() => {
      expect(getProjectHistoricalMetrics).toHaveBeenLastCalledWith(
        "project-1",
        expect.objectContaining({ page: 0, size: 10 })
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

  it("shows unavailable banner without breaking the page", async () => {
    getProjectWorkspace.mockResolvedValue(workspace());
    getProjectHistoricalMetrics.mockResolvedValueOnce(historyResponse({
      dataState: "UNAVAILABLE",
      records: [],
      pagination: { currentPage: 0, pageSize: 25, totalElements: 0, totalPages: 0, sortDirection: "DESC" }
    }));

    renderPage();

    await waitFor(() => {
      expect(getProjectHistoricalMetrics).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText("Historical data is temporarily unavailable for this selection.")).toBeInTheDocument();
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

  it("surfaces connection degraded and recovery states through the shared status component", async () => {
    getProjectWorkspace.mockResolvedValue(workspace());
    getProjectHistoricalMetrics
      .mockResolvedValueOnce(historyResponse())
      .mockRejectedValueOnce({ status: 500 })
      .mockResolvedValueOnce(historyResponse({
        generatedAt: "2026-08-03T12:03:00Z"
      }));

    renderPage();

    expect(await screen.findByText("Connected")).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Refresh history" }));
      await Promise.resolve();
    });
    await act(async () => {
      pollingStateControls.setConnectionState(CONNECTION_STATE.DEGRADED);
      pollingStateControls.setLastError({ status: 500 });
      await Promise.resolve();
    });
    expect(screen.getByLabelText("Observability connection status Degraded")).toBeInTheDocument();
    expect(screen.getByText("Connection degraded. A refresh failed, but the last successful historical data remains visible."))
      .toBeInTheDocument();
    await act(async () => {
      pollingStateControls.setConnectionState(CONNECTION_STATE.CONNECTED);
      pollingStateControls.setLastError(null);
      pollingStateControls.setLastSuccessfulRefreshAt("2026-08-03T12:03:00Z");
      fireEvent.click(screen.getByRole("button", { name: "Refresh history" }));
      await Promise.resolve();
    });
    expect(await screen.findByText("Connected")).toBeInTheDocument();
  });
});
