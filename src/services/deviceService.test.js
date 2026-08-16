import { describe, expect, it, vi } from "vitest";
import { apiRequest } from "./apiClient";
import { disableDeviceMaintenance, enableDeviceMaintenance, getDeviceInventory, getDeviceMaintenance, getDeviceMaintenanceHistory } from "./deviceService";

vi.mock("./apiClient", () => ({ apiRequest: vi.fn() }));

describe("getDeviceInventory", () => {
  it("forwards search, pagination and sorting to the Gateway route", async () => {
    apiRequest.mockResolvedValue({ devices: [] });
    await getDeviceInventory({ search: "Alpha Node", page: 2, size: 10, sort: "lastSeen", direction: "desc" });
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/v1/devices/inventory?search=Alpha+Node&page=2&size=10&sort=lastSeen&direction=desc"
    );
  });

  it("encodes project, group and repeated AND tag filters", async () => {
    apiRequest.mockResolvedValue({ devices: [] });
    await getDeviceInventory({ projectId: "p 1", groupId: "g-1", tagIds: ["t-1", "t-2"] });
    expect(apiRequest.mock.calls.at(-1)[0]).toContain("projectId=p+1&groupId=g-1&tagIds=t-1&tagIds=t-2");
  });
  it("encodes heartbeat status filtering",async()=>{apiRequest.mockResolvedValue({devices:[]});await getDeviceInventory({heartbeatStatus:"OFFLINE"});expect(apiRequest.mock.calls.at(-1)[0]).toContain("heartbeatStatus=OFFLINE");});
  it("uses Gateway-facing global and project maintenance routes",async()=>{apiRequest.mockResolvedValue({});await getDeviceMaintenance("device-1");expect(apiRequest).toHaveBeenLastCalledWith("/api/v1/devices/management/device-1/maintenance");await getDeviceMaintenanceHistory("device-1","project-1");expect(apiRequest).toHaveBeenLastCalledWith("/api/v1/devices/management/projects/project-1/devices/device-1/maintenance/history");await enableDeviceMaintenance("device-1",{reason:"Work"},"project-1");expect(apiRequest).toHaveBeenLastCalledWith("/api/v1/devices/management/projects/project-1/devices/device-1/maintenance",{method:"POST",body:'{"reason":"Work"}'});await disableDeviceMaintenance("device-1");expect(apiRequest).toHaveBeenLastCalledWith("/api/v1/devices/management/device-1/maintenance",{method:"DELETE"});});
});
