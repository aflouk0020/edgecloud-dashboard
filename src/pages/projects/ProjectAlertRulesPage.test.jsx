import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

import { AuthProvider } from "../../context/AuthContext";
import ProjectAlertRulesPage from "./ProjectAlertRulesPage";
import { getProjectWorkspace } from "../../services/projectWorkspaceService";
import {
  createProjectAlertRule,
  deleteProjectAlertRule,
  getProjectAlertRules,
  updateProjectAlertRule,
  updateProjectAlertRuleEnabled
} from "../../services/projectAlertRuleService";

vi.mock("../../services/projectWorkspaceService", () => ({
  getProjectWorkspace: vi.fn(),
  normalizeWorkspaceError: vi.fn(error => ({
    status: error.status,
    title: error.status === 403 ? "Access denied" : error.status === 422 ? "Archived project" : "Unable to load workspace",
    message: "Workspace unavailable"
  }))
}));

vi.mock("../../services/projectAlertRuleService", () => ({
  createProjectAlertRule: vi.fn(),
  deleteProjectAlertRule: vi.fn(),
  getProjectAlertRules: vi.fn(),
  normalizeProjectAlertRuleError: vi.fn(error => ({
    status: error.status,
    title: error.status === 403 ? "Access denied" : "Unable to load alert rules",
    message: "Alert rules unavailable"
  })),
  updateProjectAlertRule: vi.fn(),
  updateProjectAlertRuleEnabled: vi.fn()
}));

function workspace(overrides = {}) {
  return {
    projectId: "project-1",
    projectName: "Fleet Observability",
    projectStatus: "ACTIVE",
    callerProjectRole: "PROJECT_ADMIN",
    serviceIds: ["service-1"],
    deviceIds: ["device-1"],
    ...overrides
  };
}

function rule(overrides = {}) {
  return {
    id: "rule-1",
    projectId: "project-1",
    name: "CPU high",
    description: "High CPU usage",
    metricType: "CPU_USAGE",
    thresholdValue: 80,
    comparisonOperator: "GREATER_THAN",
    severity: "HIGH",
    enabled: true,
    deviceId: null,
    serviceId: null,
    updatedAt: "2026-08-10T10:00:00Z",
    ...overrides
  };
}

function renderPage(role = "PROJECT_ADMIN") {
  localStorage.setItem("role", role);
  localStorage.setItem("token", "token");
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/projects/project-1/alert-rules"]}>
        <Routes>
          <Route path="/projects/:projectId/alert-rules" element={<ProjectAlertRulesPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getProjectWorkspace.mockResolvedValue(workspace());
  getProjectAlertRules.mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("ProjectAlertRulesPage", () => {
  it("loads workspace before requesting rules", async () => {
    const order = [];
    getProjectWorkspace.mockImplementation(async () => { order.push("workspace"); return workspace(); });
    getProjectAlertRules.mockImplementation(async () => { order.push("rules"); return []; });

    renderPage();

    await screen.findByRole("heading", { name: "Alert Rules" });
    expect(order).toEqual(["workspace", "rules"]);
  });

  it("shows loading, empty, and successful rule list states", async () => {
    let resolveRules;
    getProjectAlertRules.mockReturnValue(new Promise(resolve => { resolveRules = resolve; }));
    renderPage();
    expect(await screen.findByText("Loading alert rules...")).toBeInTheDocument();
    resolveRules([rule()]);
    expect((await screen.findAllByText("CPU high")).length).toBeGreaterThan(0);

    getProjectAlertRules.mockResolvedValue([]);
  });

  it("shows workspace access errors and does not request rules", async () => {
    getProjectWorkspace.mockRejectedValue({ status: 403 });
    renderPage();
    expect(await screen.findByText("Access denied")).toBeInTheDocument();
    expect(getProjectAlertRules).not.toHaveBeenCalled();
  });

  it("renders archived projects without mutation controls", async () => {
    getProjectWorkspace.mockResolvedValue(workspace({ projectStatus: "ARCHIVED" }));
    getProjectAlertRules.mockResolvedValue([rule()]);
    renderPage("PROJECT_ADMIN");
    expect((await screen.findAllByText("CPU high")).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Create Rule" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  });

  it("keeps VIEWER read-only", async () => {
    getProjectAlertRules.mockResolvedValue([rule()]);
    renderPage("VIEWER");
    expect((await screen.findAllByText("CPU high")).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Create Rule" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Disable" })).not.toBeInTheDocument();
  });

  it.each(["ADMIN", "PROJECT_ADMIN", "OPERATOR"])("shows mutation controls for %s", async role => {
    renderPage(role);
    expect((await screen.findAllByRole("button", { name: "Create Rule" })).length).toBeGreaterThan(0);
  });

  it("creates a device-target rule after client validation", async () => {
    const user = userEvent.setup();
    createProjectAlertRule.mockResolvedValue(rule({ id: "new-rule", name: "Device CPU", deviceId: "device-1" }));
    renderPage();
    await screen.findAllByRole("button", { name: "Create Rule" });
    await user.click(screen.getAllByRole("button", { name: "Create Rule" })[0]);
    await user.type(screen.getByLabelText("Name"), "Device CPU");
    await user.type(screen.getByLabelText("Threshold"), "80");
    await user.selectOptions(screen.getByLabelText("Target"), "DEVICE");
    await user.selectOptions(screen.getByLabelText("Device"), "device-1");
    await user.click(screen.getByRole("button", { name: "Save Rule" }));
    await waitFor(() => expect(createProjectAlertRule).toHaveBeenCalledWith("project-1", expect.objectContaining({ deviceId: "device-1", serviceId: null })));
  });

  it("rejects a blank name without calling the API", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click((await screen.findAllByRole("button", { name: "Create Rule" }))[0]);
    await user.click(screen.getByRole("button", { name: "Save Rule" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Name is required");
    expect(createProjectAlertRule).not.toHaveBeenCalled();
  });

  it("edits, toggles, and deletes with confirmation", async () => {
    const user = userEvent.setup();
    getProjectAlertRules.mockResolvedValue([rule()]);
    updateProjectAlertRule.mockResolvedValue(rule({ name: "Updated" }));
    updateProjectAlertRuleEnabled.mockResolvedValue(rule({ enabled: false }));
    deleteProjectAlertRule.mockResolvedValue({});
    vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    renderPage();
    await screen.findAllByText("CPU high");
    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Updated");
    await user.click(screen.getByRole("button", { name: "Save Rule" }));
    expect(updateProjectAlertRule).toHaveBeenCalled();
    await user.click(screen.getAllByRole("button", { name: "Disable" })[0]);
    expect(updateProjectAlertRuleEnabled).toHaveBeenCalledWith("project-1", "rule-1", false);
    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    await waitFor(() => expect(deleteProjectAlertRule).toHaveBeenCalledWith("project-1", "rule-1"));
  });
});
