import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("./apiClient", () => ({ apiRequest: vi.fn() }));
import { apiRequest } from "./apiClient";
import { createMaintenanceWindow, deleteMaintenanceWindow, getMaintenanceSuppressions, getMaintenanceWindows, updateMaintenanceWindow } from "./maintenanceWindowService";

describe("maintenanceWindowService", () => {
  beforeEach(() => apiRequest.mockReset());
  it("uses project-scoped encoded endpoints", () => {
    getMaintenanceWindows("p 1");
    expect(apiRequest).toHaveBeenCalledWith("/api/v2/projects/p%201/maintenance-windows");
    getMaintenanceSuppressions("p", "w/1");
    expect(apiRequest).toHaveBeenLastCalledWith("/api/v2/projects/p/maintenance-windows/w%2F1/suppressions");
  });
  it("uses the expected mutation methods", () => {
    const payload = { name: "Upgrade" };
    createMaintenanceWindow("p", payload);
    expect(apiRequest.mock.calls[0][1]).toMatchObject({ method: "POST" });
    updateMaintenanceWindow("p", "w", payload);
    expect(apiRequest.mock.calls[1][1]).toMatchObject({ method: "PUT" });
    deleteMaintenanceWindow("p", "w");
    expect(apiRequest.mock.calls[2][1]).toMatchObject({ method: "DELETE", responseType: "raw" });
  });
});
