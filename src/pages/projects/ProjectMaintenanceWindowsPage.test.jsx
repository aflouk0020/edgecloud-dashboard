import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProjectMaintenanceWindowsPage from "./ProjectMaintenanceWindowsPage";

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ role: "ADMIN" }) }));
vi.mock("../../services/projectWorkspaceService", () => ({
  getProjectWorkspace: vi.fn(), normalizeWorkspaceError: vi.fn(error => error)
}));
vi.mock("../../services/maintenanceWindowService", () => ({
  getMaintenanceWindows: vi.fn(), createMaintenanceWindow: vi.fn(), updateMaintenanceWindow: vi.fn(),
  deleteMaintenanceWindow: vi.fn(), getMaintenanceSuppressions: vi.fn(), normalizeMaintenanceWindowError: vi.fn(error => error)
}));
import { getProjectWorkspace } from "../../services/projectWorkspaceService";
import { getMaintenanceSuppressions, getMaintenanceWindows } from "../../services/maintenanceWindowService";

const windowRecord = { id: "w-1", name: "Database upgrade", reason: "Planned work", scopeType: "PROJECT", startsAt: "2026-08-11T10:00:00Z", endsAt: "2026-08-11T11:00:00Z", enabled: true, status: "ACTIVE", suppressionCount: 1 };

describe("ProjectMaintenanceWindowsPage", () => {
  beforeEach(() => {
    getProjectWorkspace.mockResolvedValue({ projectName: "Edge", projectStatus: "ACTIVE", callerProjectRole: "PROJECT_ADMIN", serviceIds: ["service-1"], deviceIds: ["device-1"] });
    getMaintenanceWindows.mockResolvedValue([windowRecord]);
    getMaintenanceSuppressions.mockResolvedValue([{ id: "s-1", ruleName: "CPU high", sourceType: "DEVICE", sourceId: "device-1", metricType: "CPU_USAGE", observedValue: 95, thresholdValue: 80, suppressedAt: "2026-08-11T10:05:00Z" }]);
  });

  it("shows scope, status, admin controls and suppression history", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={["/projects/p-1/maintenance"]}><Routes><Route path="/projects/:projectId/maintenance" element={<ProjectMaintenanceWindowsPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByText("Database upgrade")).toBeInTheDocument();
    expect(screen.getByText("Entire project")).toBeInTheDocument();
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create window" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Suppression history" }));
    await waitFor(() => expect(screen.getByText("CPU high")).toBeInTheDocument());
    expect(getMaintenanceSuppressions).toHaveBeenCalledWith("p-1", "w-1");
  });
});
