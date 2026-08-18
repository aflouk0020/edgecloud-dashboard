import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAccessibleProjects, getDeviceGroups, getDeviceInventory, getDeviceTags } from "../../services/deviceService";
import DevicesPage from "./DevicesPage";

vi.mock("../../services/deviceService", () => ({
  getDeviceInventory: vi.fn(), deactivateDevice: vi.fn(), reactivateDevice: vi.fn(),
  removeDevice: vi.fn(), getDeviceHistory: vi.fn(), registerDevice: vi.fn(), updateDevice: vi.fn()
  , getAccessibleProjects: vi.fn(), getDeviceGroups: vi.fn(), getDeviceTags: vi.fn()
  , createDeviceGroup: vi.fn(), updateDeviceGroup: vi.fn(), deleteDeviceGroup: vi.fn(), getGroupMembers: vi.fn(), assignGroupDevices: vi.fn(), removeGroupDevice: vi.fn(), createDeviceTag: vi.fn(), updateDeviceTag: vi.fn(), deleteDeviceTag: vi.fn(), assignDeviceTags: vi.fn()
  , getAssignedDeviceTags: vi.fn()
  , getHeartbeatState: vi.fn(), getHeartbeatHistory: vi.fn(), getHeartbeatStatistics: vi.fn()
  , getDeviceMaintenance: vi.fn(), getDeviceMaintenanceHistory: vi.fn(), enableDeviceMaintenance: vi.fn(), disableDeviceMaintenance: vi.fn()
  , getDeviceConfiguration: vi.fn(), updateDeviceConfiguration: vi.fn(), getDeviceConfigurationHistory: vi.fn(), restoreDeviceConfiguration: vi.fn(), getDeviceConfigurationTemplates: vi.fn(), createDeviceConfigurationTemplate: vi.fn(), updateDeviceConfigurationTemplate: vi.fn(), applyDeviceConfigurationTemplate: vi.fn()
}));
const { mockRole } = vi.hoisted(() => ({ mockRole: { value: "ADMIN" } }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ role: mockRole.value }) }));

const devices = [
  { deviceId: "11111111-1111-1111-1111-111111111111", name: "Alpha", type: "SENSOR", operationalStatus: "ONLINE", heartbeatStatus: "CURRENT", latestHeartbeat: "2026-08-16T10:00:00", maintenanceMode: true, maintenanceReason: "Planned inspection", firmwareVersion: null, assignedProject: null, registrationDate: "2026-08-01T09:00:00", lastSeen: "2026-08-16T10:00:00", tags: [], location: null },
  { deviceId: "22222222-2222-2222-2222-222222222222", name: "Bravo", type: "GATEWAY", operationalStatus: "OFFLINE", heartbeatStatus: "STALE", latestHeartbeat: "2026-08-15T10:00:00", firmwareVersion: null, assignedProject: null, registrationDate: "2026-08-02T09:00:00", lastSeen: "2026-08-15T10:00:00", tags: [], location: null }
];

function response(overrides = {}) {
  return { devices, page: 0, size: 10, totalElements: 12, totalPages: 2, sort: "name", direction: "asc", ...overrides };
}

describe("DevicesPage", () => {
  beforeEach(() => { vi.clearAllMocks(); mockRole.value = "ADMIN"; getAccessibleProjects.mockResolvedValue([]); getDeviceGroups.mockResolvedValue([]); getDeviceTags.mockResolvedValue([]); });

  it("renders inventory metadata and keeps offline devices visible", async () => {
    getDeviceInventory.mockResolvedValue(response());
    render(<DevicesPage />);
    expect(screen.getByText("Loading device inventory...")).toBeInTheDocument();
    expect((await screen.findAllByText("Alpha")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bravo").length).toBeGreaterThan(0);
    expect(screen.getAllByText("OFFLINE").length).toBeGreaterThan(0);
    expect(screen.getAllByText("STALE").length).toBeGreaterThan(0);
    expect(screen.getAllByText("MAINTENANCE").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Planned inspection").length).toBeGreaterThan(0);
    expect(screen.getAllByText("CURRENT").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Not recorded").length).toBeGreaterThan(0);
  });

  it("submits server-side search", async () => {
    const user = userEvent.setup();
    getDeviceInventory.mockResolvedValue(response());
    render(<DevicesPage />);
    await screen.findAllByText("Alpha");
    await user.type(screen.getByLabelText("Search by device name or ID"), "Bravo");
    await user.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() => expect(getDeviceInventory).toHaveBeenLastCalledWith(expect.objectContaining({ search: "Bravo", page: 0 })));
  });

  it("changes sorting and requests the next page", async () => {
    const user = userEvent.setup();
    getDeviceInventory.mockResolvedValue(response());
    render(<DevicesPage />);
    await screen.findAllByText("Alpha");
    await user.selectOptions(screen.getByLabelText("Sort by"), "lastSeen");
    await user.selectOptions(screen.getByLabelText("Sort direction"), "desc");
    await waitFor(() => expect(getDeviceInventory).toHaveBeenLastCalledWith(expect.objectContaining({ sort: "lastSeen", direction: "desc" })));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(getDeviceInventory).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 })));
  });

  it("shows empty search results", async () => {
    const user = userEvent.setup();
    getDeviceInventory.mockResolvedValueOnce(response()).mockResolvedValueOnce(response({ devices: [], totalElements: 0, totalPages: 0 }));
    render(<DevicesPage />);
    await screen.findAllByText("Alpha");
    await user.type(screen.getByLabelText("Search by device name or ID"), "missing");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(await screen.findByText("No Matching Devices")).toBeInTheDocument();
  });

  it("shows initial empty and error states", async () => {
    getDeviceInventory.mockResolvedValueOnce(response({ devices: [], totalElements: 0, totalPages: 0 }));
    const first = render(<DevicesPage />);
    expect(await screen.findByText("No Registered Devices")).toBeInTheDocument();
    first.unmount();
    getDeviceInventory.mockRejectedValueOnce(new Error("network"));
    render(<DevicesPage />);
    expect(await screen.findByText("Unable to load the device inventory. Please try again.")).toBeInTheDocument();
  });

  it("composes project, group and multiple tag filters and clears them", async () => {
    const user = userEvent.setup();
    getAccessibleProjects.mockResolvedValue([{ id: "project-1", name: "Factory", status: "ACTIVE" }]);
    getDeviceGroups.mockResolvedValue([{ id: "group-1", name: "Production" }]);
    getDeviceTags.mockResolvedValue([{ id: "tag-1", name: "Critical" }, { id: "tag-2", name: "ARM64" }]);
    getDeviceInventory.mockResolvedValue(response());
    render(<DevicesPage />); await screen.findAllByText("Alpha");
    await user.selectOptions(screen.getByLabelText("Project"), "project-1");
    await screen.findByRole("option", { name: "Production" });
    await user.selectOptions(screen.getByLabelText("Group filter"), "group-1");
    await user.click(screen.getByLabelText("Critical")); await user.click(screen.getByLabelText("ARM64"));
    await user.selectOptions(screen.getByLabelText("Heartbeat status filter"),"OFFLINE");
    await waitFor(() => expect(getDeviceInventory).toHaveBeenLastCalledWith(expect.objectContaining({ projectId: "project-1", groupId: "group-1", tagIds: ["tag-1", "tag-2"],heartbeatStatus:"OFFLINE" })));
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(getDeviceInventory).toHaveBeenLastCalledWith(expect.objectContaining({ groupId: "", tagIds: [],heartbeatStatus:"" })));
  });

  it("shows archived projects as unavailable while preserving active operational selection", async () => {
    const user = userEvent.setup();
    getAccessibleProjects.mockResolvedValue([
      { id: "archived-1", name: "SCRUM-720 Validation", status: "ARCHIVED" },
      { id: "active-1", name: "Factory", status: "ACTIVE" }
    ]);
    getDeviceInventory.mockResolvedValue(response());
    render(<DevicesPage />);
    await screen.findAllByText("Alpha");

    expect(screen.getByRole("option", { name: "SCRUM-720 Validation (Archived)" })).toBeDisabled();
    expect(screen.getByRole("option", { name: "Factory" })).toBeInTheDocument();
    expect(getDeviceInventory).toHaveBeenCalledWith(expect.objectContaining({ projectId: "" }));

    await user.selectOptions(screen.getByLabelText("Project"), "active-1");
    await waitFor(() => expect(getDeviceInventory).toHaveBeenLastCalledWith(expect.objectContaining({ projectId: "active-1" })));
  });

  it("auto-selects the first active project for PROJECT_ADMIN but never an archived project", async () => {
    mockRole.value = "PROJECT_ADMIN";
    getAccessibleProjects.mockResolvedValue([
      { id: "archived-1", name: "Archived", status: "ARCHIVED" },
      { id: "active-1", name: "Active", status: "ACTIVE" }
    ]);
    getDeviceInventory.mockResolvedValue(response());
    render(<DevicesPage />);

    await waitFor(() => expect(getDeviceInventory).toHaveBeenLastCalledWith(expect.objectContaining({ projectId: "active-1" })));
    expect(screen.getByRole("option", { name: "Archived (Archived)" })).toBeDisabled();
  });

  it("keeps VIEWER on all accessible devices without management controls", async () => {
    mockRole.value = "VIEWER";
    getAccessibleProjects.mockResolvedValue([{ id: "active-1", name: "Active", status: "ACTIVE" }]);
    getDeviceInventory.mockResolvedValue(response());
    render(<DevicesPage />);
    await screen.findAllByText("Alpha");

    expect(getDeviceInventory).toHaveBeenCalledWith(expect.objectContaining({ projectId: "" }));
    expect(screen.queryByRole("button", { name: "Register Device" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Manage groups and tags" })).not.toBeInTheDocument();
  });
});
