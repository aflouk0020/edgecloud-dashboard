import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DeviceManagementDialog from "./DeviceManagementDialog";
import { getDeviceHistory, registerDevice, updateDevice } from "../../services/deviceService";

vi.mock("../../services/deviceService", () => ({ getDeviceHistory: vi.fn(), registerDevice: vi.fn(), updateDevice: vi.fn() }));
const device = { deviceId: "11111111-1111-1111-1111-111111111111", name: "Alpha", type: "SENSOR", ipAddress: "10.0.0.1" };

describe("DeviceManagementDialog", () => {
  beforeEach(() => vi.clearAllMocks());
  it("validates required registration fields", async () => { const user=userEvent.setup(); render(<DeviceManagementDialog mode="new" onClose={vi.fn()} onSaved={vi.fn()} />); await user.click(screen.getByRole("button",{name:"Save Device"})); expect(screen.getByRole("alert")).toHaveTextContent("required"); expect(registerDevice).not.toHaveBeenCalled(); });
  it("registers valid metadata and reports success", async () => { const user=userEvent.setup(); const saved=vi.fn(); registerDevice.mockResolvedValue({}); render(<DeviceManagementDialog mode="new" onClose={vi.fn()} onSaved={saved} />); await user.type(screen.getByLabelText("Device name"),"Alpha"); await user.type(screen.getByLabelText("Device type"),"SENSOR"); await user.type(screen.getByLabelText("IP address"),"10.0.0.1"); await user.click(screen.getByRole("button",{name:"Save Device"})); await waitFor(()=>expect(registerDevice).toHaveBeenCalled()); expect(saved).toHaveBeenCalledWith("Device registered."); });
  it("updates an existing device", async () => { const user=userEvent.setup(); updateDevice.mockResolvedValue({}); const saved=vi.fn(); render(<DeviceManagementDialog mode="edit" device={device} onClose={vi.fn()} onSaved={saved} />); await user.clear(screen.getByLabelText("Device name")); await user.type(screen.getByLabelText("Device name"),"Beta"); await user.click(screen.getByRole("button",{name:"Save Device"})); await waitFor(()=>expect(updateDevice).toHaveBeenCalledWith(device.deviceId,expect.objectContaining({name:"Beta"}))); });
  it("renders lifecycle history", async () => { getDeviceHistory.mockResolvedValue([{id:1,action:"DEACTIVATED",occurredAt:"2026-08-16T10:00:00",details:"Device deactivated"}]); render(<DeviceManagementDialog mode="history" device={device} onClose={vi.fn()} onSaved={vi.fn()} />); expect(await screen.findByText("DEACTIVATED")).toBeInTheDocument(); });
});
