import { describe, expect, it, vi } from "vitest";
import { apiRequest } from "./apiClient";
import { getDeviceInventory } from "./deviceService";

vi.mock("./apiClient", () => ({ apiRequest: vi.fn() }));

describe("getDeviceInventory", () => {
  it("forwards search, pagination and sorting to the Gateway route", async () => {
    apiRequest.mockResolvedValue({ devices: [] });
    await getDeviceInventory({ search: "Alpha Node", page: 2, size: 10, sort: "lastSeen", direction: "desc" });
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/v1/devices/inventory?search=Alpha+Node&page=2&size=10&sort=lastSeen&direction=desc"
    );
  });
});
