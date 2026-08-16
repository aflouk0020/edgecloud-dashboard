import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDeviceInventory } from "../../services/deviceService";
import DevicesPage from "./DevicesPage";

vi.mock("../../services/deviceService", () => ({
  getDeviceInventory: vi.fn(), deactivateDevice: vi.fn(), reactivateDevice: vi.fn(),
  removeDevice: vi.fn(), getDeviceHistory: vi.fn(), registerDevice: vi.fn(), updateDevice: vi.fn()
}));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ role: "ADMIN" }) }));

const devices = [
  { deviceId: "11111111-1111-1111-1111-111111111111", name: "Alpha", type: "SENSOR", operationalStatus: "ONLINE", heartbeatStatus: "CURRENT", latestHeartbeat: "2026-08-16T10:00:00", firmwareVersion: null, assignedProject: null, registrationDate: "2026-08-01T09:00:00", lastSeen: "2026-08-16T10:00:00", tags: [], location: null },
  { deviceId: "22222222-2222-2222-2222-222222222222", name: "Bravo", type: "GATEWAY", operationalStatus: "OFFLINE", heartbeatStatus: "STALE", latestHeartbeat: "2026-08-15T10:00:00", firmwareVersion: null, assignedProject: null, registrationDate: "2026-08-02T09:00:00", lastSeen: "2026-08-15T10:00:00", tags: [], location: null }
];

function response(overrides = {}) {
  return { devices, page: 0, size: 10, totalElements: 12, totalPages: 2, sort: "name", direction: "asc", ...overrides };
}

describe("DevicesPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders inventory metadata and keeps offline devices visible", async () => {
    getDeviceInventory.mockResolvedValue(response());
    render(<DevicesPage />);
    expect(screen.getByText("Loading device inventory...")).toBeInTheDocument();
    expect((await screen.findAllByText("Alpha")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bravo").length).toBeGreaterThan(0);
    expect(screen.getAllByText("OFFLINE").length).toBeGreaterThan(0);
    expect(screen.getAllByText("STALE").length).toBeGreaterThan(0);
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
});
