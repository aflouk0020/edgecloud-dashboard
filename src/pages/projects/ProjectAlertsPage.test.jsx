import { MemoryRouter, Route, Routes } from "react-router-dom";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ProjectAlertsPage from "./ProjectAlertsPage";
import { AuthProvider } from "../../context/AuthContext";
import { getProjectWorkspace } from "../../services/projectWorkspaceService";
import { getProjectAlert, listProjectAlerts } from "../../services/projectAlertEventService";

vi.mock("../../services/projectWorkspaceService", () => ({
  getProjectWorkspace: vi.fn(),
  normalizeWorkspaceError: vi.fn(error => ({
    status: error.status,
    title: error.status === 403 ? "Access denied" : error.status === 422 ? "Archived project" : "Unable to load workspace",
    message: "Workspace unavailable"
  }))
}));

vi.mock("../../services/projectAlertEventService", () => ({
  getProjectAlert: vi.fn(),
  listProjectAlerts: vi.fn(),
  normalizeProjectAlertEventError: vi.fn(error => ({
    status: error.status,
    title: error.status === 401 ? "Authentication required" : error.status === 403 ? "Access denied" : "Unable to load project alerts",
    message: "Project alerts unavailable"
  }))
}));

function workspace(overrides = {}) {
  return { projectId: "project-1", projectName: "Fleet", projectStatus: "ACTIVE", ...overrides };
}

function alert(overrides = {}) {
  return {
    id: "alert-1", alertRuleId: "rule-1", alertRuleName: "CPU saturation", projectId: "project-1",
    sourceType: "DEVICE", sourceId: "device-1", metricType: "CPU_USAGE", observedValue: 92.5,
    thresholdValue: 80, comparisonOperator: "GREATER_THAN", severity: "HIGH", status: "OPEN",
    triggeredAt: "2026-08-10T10:00:00Z", lastObservedAt: "2026-08-10T10:05:00Z", resolvedAt: null,
    createdAt: "2026-08-10T10:00:00Z", updatedAt: "2026-08-10T10:05:00Z", ...overrides
  };
}

function page(alerts = [], overrides = {}) {
  return { alerts, page: 0, size: 20, totalElements: alerts.length, totalPages: alerts.length ? 1 : 0, ...overrides };
}

function renderPage() {
  localStorage.setItem("token", "token");
  localStorage.setItem("role", "VIEWER");
  return render(<AuthProvider><MemoryRouter initialEntries={["/projects/project-1/alerts"]}><Routes><Route path="/projects/:projectId/alerts" element={<ProjectAlertsPage />} /></Routes></MemoryRouter></AuthProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  getProjectWorkspace.mockResolvedValue(workspace());
  listProjectAlerts.mockResolvedValue(page([]));
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("ProjectAlertsPage", () => {
  it("gates alert requests behind workspace access and renders loading and empty states", async () => {
    let resolveWorkspace;
    getProjectWorkspace.mockReturnValue(new Promise(resolve => { resolveWorkspace = resolve; }));
    renderPage();
    expect(screen.getByText("Loading project workspace...")).toBeInTheDocument();
    expect(listProjectAlerts).not.toHaveBeenCalled();
    resolveWorkspace(workspace());
    expect(await screen.findByText("No project alert history")).toBeInTheDocument();
  });

  it("renders OPEN/RESOLVED and all severities with evidence in table and cards", async () => {
    listProjectAlerts.mockResolvedValue(page([
      alert(),
      alert({ id: "alert-2", alertRuleName: "Memory warning", status: "RESOLVED", severity: "MEDIUM", metricType: "MEMORY_USAGE", resolvedAt: "2026-08-10T11:00:00Z" }),
      alert({ id: "alert-3", alertRuleName: "Temperature notice", severity: "LOW", metricType: "TEMPERATURE" })
    ]));
    renderPage();
    expect((await screen.findAllByText("CPU saturation")).length).toBe(2);
    expect(screen.getAllByText("● OPEN").length).toBeGreaterThan(0);
    expect(screen.getAllByText("✓ RESOLVED").length).toBeGreaterThan(0);
    expect(screen.getAllByText("▲ HIGH").length).toBeGreaterThan(0);
    expect(screen.getAllByText("◆ MEDIUM").length).toBeGreaterThan(0);
    expect(screen.getAllByText("● LOW").length).toBeGreaterThan(0);
    expect(screen.getAllByText("GREATER THAN 80").length).toBeGreaterThan(0);
    expect(document.querySelector(".project-alert-table")).toBeInTheDocument();
    expect(screen.getByLabelText("Project alert cards")).toBeInTheDocument();
    expect(listProjectAlerts).toHaveBeenCalledWith("project-1", expect.objectContaining({ page: 0, size: 20, sortDirection: "DESC" }));
  });

  it("forwards filters, preserves them during pagination, resets page, and clears filters", async () => {
    const user = userEvent.setup();
    listProjectAlerts.mockResolvedValue(page([alert()], { totalElements: 40, totalPages: 2 }));
    renderPage();
    await screen.findByText("40 total alerts");
    await user.selectOptions(screen.getByLabelText("Alert severity"), "HIGH");
    await user.selectOptions(screen.getByLabelText("Alert source type"), "DEVICE");
    await user.type(screen.getByLabelText("Alert source ID"), "device-1");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(listProjectAlerts).toHaveBeenCalledWith("project-1", expect.objectContaining({ page: 1, severity: "HIGH", sourceType: "DEVICE", sourceId: "device-1" })));
    await user.selectOptions(screen.getByLabelText("Alert status"), "OPEN");
    await waitFor(() => expect(listProjectAlerts).toHaveBeenCalledWith("project-1", expect.objectContaining({ page: 0, status: "OPEN" })));
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(listProjectAlerts).toHaveBeenCalledWith("project-1", expect.objectContaining({ page: 0, status: "", severity: "", sourceType: "", sourceId: "" })));
  });

  it("shows filtered-empty state and forwards date filters", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("No project alert history");
    await user.selectOptions(screen.getByLabelText("Alert status"), "RESOLVED");
    expect(await screen.findByText("No matching project alerts")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Alert from"), "2026-08-01T10:00");
    await user.type(screen.getByLabelText("Alert to"), "2026-08-10T10:00");
    await waitFor(() => expect(listProjectAlerts).toHaveBeenCalledWith("project-1", expect.objectContaining({ from: expect.stringContaining("2026-08-01T"), to: expect.stringContaining("2026-08-10T") })));
  });

  it("loads complete project-scoped detail evidence and handles resolvedAt", async () => {
    const user = userEvent.setup();
    const resolved = alert({ status: "RESOLVED", resolvedAt: "2026-08-10T11:00:00Z" });
    listProjectAlerts.mockResolvedValue(page([resolved]));
    let resolveDetail;
    getProjectAlert.mockReturnValue(new Promise(resolve => { resolveDetail = resolve; }));
    renderPage();
    await user.click((await screen.findAllByRole("button", { name: "View details" }))[0]);
    expect(screen.getByText("Loading alert detail...")).toBeInTheDocument();
    resolveDetail(resolved);
    const dialog = await screen.findByRole("dialog");
    expect(getProjectAlert).toHaveBeenCalledWith("project-1", "alert-1");
    expect(await within(dialog).findByText("rule-1")).toBeInTheDocument();
    expect(within(dialog).getByText("project-1")).toBeInTheDocument();
    expect(within(dialog).getByText("92.5")).toBeInTheDocument();
    expect(within(dialog).queryByText("Not resolved")).not.toBeInTheDocument();
    expect(within(dialog).getByText("GREATER THAN")).toBeInTheDocument();
  });

  it("shows detail errors", async () => {
    const user = userEvent.setup();
    listProjectAlerts.mockResolvedValue(page([alert()]));
    getProjectAlert.mockRejectedValue({ status: 403 });
    renderPage();
    await user.click((await screen.findAllByRole("button", { name: "View details" }))[0]);
    expect(await screen.findByText("Access denied")).toBeInTheDocument();
  });

  it("shows API authorization errors and supports retry", async () => {
    const user = userEvent.setup();
    listProjectAlerts.mockRejectedValueOnce({ status: 401 }).mockResolvedValueOnce(page([]));
    renderPage();
    expect(await screen.findByText("Authentication required")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("No project alert history")).toBeInTheDocument();
  });

  it("shows inaccessible and archived workspace states without premature requests", async () => {
    getProjectWorkspace.mockRejectedValueOnce({ status: 403 });
    const first = renderPage();
    expect(await screen.findByText("Access denied")).toBeInTheDocument();
    expect(listProjectAlerts).not.toHaveBeenCalled();
    first.unmount();

    getProjectWorkspace.mockResolvedValueOnce(workspace({ projectStatus: "ARCHIVED" }));
    renderPage();
    expect(await screen.findByText("Archived project")).toBeInTheDocument();
    expect(screen.getByText("Historical alerts are read-only.")).toBeInTheDocument();
  });
});
