import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  disableDeviceMaintenance,
  enableDeviceMaintenance,
  getDeviceMaintenance,
  getDeviceMaintenanceHistory
} from "../../services/deviceService";
import DeviceMaintenanceDialog from "./DeviceMaintenanceDialog";

vi.mock("../../services/deviceService", () => ({
  disableDeviceMaintenance: vi.fn(),
  enableDeviceMaintenance: vi.fn(),
  getDeviceMaintenance: vi.fn(),
  getDeviceMaintenanceHistory: vi.fn()
}));

const device = { deviceId: "device-1", name: "Alpha", active: true, heartbeatStatus: "HEALTHY" };
const inactive = { maintenanceMode: false, reason: null, enabledAt: null, enabledBy: null, scheduledEndAt: null };
const enabled = { maintenanceMode: true, reason: "Planned upgrade", enabledAt: "2026-08-16T10:00:00", enabledBy: "user-1", scheduledEndAt: "2026-08-17T10:00:00" };
const history = [{ id: 1, action: "EXPIRED", occurredAt: "2026-08-15T10:00:00", actorUserId: null, reason: "Previous work" }];

function renderDialog(role = "ADMIN", onChanged = vi.fn()) {
  return { onChanged, ...render(<DeviceMaintenanceDialog device={device} projectId="project-1" role={role} onClose={vi.fn()} onChanged={onChanged} />) };
}

describe("DeviceMaintenanceDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDeviceMaintenance.mockResolvedValue(inactive);
    getDeviceMaintenanceHistory.mockResolvedValue([]);
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("renders loading, maintenance details, expired history and distinct lifecycle/heartbeat context", async () => {
    getDeviceMaintenance.mockResolvedValue(enabled);
    getDeviceMaintenanceHistory.mockResolvedValue(history);
    renderDialog();
    expect(screen.getByText("Loading maintenance details…")).toBeInTheDocument();
    expect(await screen.findByText("Planned upgrade")).toBeInTheDocument();
    expect(screen.getByText("EXPIRED")).toBeInTheDocument();
    expect(screen.getByText(/Lifecycle remains active; heartbeat remains HEALTHY/)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveClass("device-maintenance-dialog");
  });

  it("enables scheduled maintenance after confirmation and refreshes state", async () => {
    const user = userEvent.setup();
    enableDeviceMaintenance.mockResolvedValue(enabled);
    getDeviceMaintenance.mockResolvedValueOnce(inactive).mockResolvedValueOnce(enabled);
    getDeviceMaintenanceHistory.mockResolvedValueOnce([]).mockResolvedValueOnce(history);
    const { onChanged } = renderDialog("OPERATOR");
    await screen.findByRole("button", { name: "Enable maintenance" });
    await user.type(screen.getByLabelText("Maintenance reason"), "Planned upgrade");
    await user.type(screen.getByLabelText("Scheduled maintenance end"), "2099-01-01T10:00");
    await user.click(screen.getByRole("button", { name: "Enable maintenance" }));
    expect(window.confirm).toHaveBeenCalledWith("Enable maintenance mode for Alpha?");
    await waitFor(() => expect(enableDeviceMaintenance).toHaveBeenCalledWith("device-1", {
      reason: "Planned upgrade", scheduledEndAt: "2099-01-01T10:00"
    }, "project-1"));
    expect(await screen.findByText("Maintenance mode enabled.")).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalled();
  });

  it("validates a past scheduled end without making a request", async () => {
    const user = userEvent.setup();
    renderDialog();
    await screen.findByRole("button", { name: "Enable maintenance" });
    await user.type(screen.getByLabelText("Scheduled maintenance end"), "2020-01-01T10:00");
    await user.click(screen.getByRole("button", { name: "Enable maintenance" }));
    expect(await screen.findByText("Scheduled end must be in the future.")).toBeInTheDocument();
    expect(enableDeviceMaintenance).not.toHaveBeenCalled();
  });

  it("disables active maintenance after confirmation", async () => {
    const user = userEvent.setup();
    getDeviceMaintenance.mockResolvedValueOnce(enabled).mockResolvedValueOnce(inactive);
    const { onChanged } = renderDialog();
    await user.click(await screen.findByRole("button", { name: "Disable maintenance" }));
    expect(window.confirm).toHaveBeenCalledWith("Disable maintenance mode for Alpha?");
    await waitFor(() => expect(disableDeviceMaintenance).toHaveBeenCalledWith("device-1", "project-1"));
    expect(await screen.findByText("Maintenance mode disabled.")).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalled();
  });

  it("keeps project administrators read-only and handles empty/error states", async () => {
    const first = renderDialog("PROJECT_ADMIN");
    expect(await screen.findByText("No maintenance events recorded.")).toBeInTheDocument();
    expect(screen.getByText("This role has read-only access to maintenance information.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enable maintenance" })).not.toBeInTheDocument();
    first.unmount();

    getDeviceMaintenance.mockRejectedValueOnce(new Error("Maintenance API unavailable"));
    renderDialog("VIEWER");
    expect(await screen.findByRole("alert")).toHaveTextContent("Maintenance API unavailable");
  });
});
