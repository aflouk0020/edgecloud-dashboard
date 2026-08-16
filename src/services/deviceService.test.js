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

  it("encodes project, group and repeated AND tag filters", async () => {
    apiRequest.mockResolvedValue({ devices: [] });
    await getDeviceInventory({ projectId: "p 1", groupId: "g-1", tagIds: ["t-1", "t-2"] });
    expect(apiRequest.mock.calls.at(-1)[0]).toContain("projectId=p+1&groupId=g-1&tagIds=t-1&tagIds=t-2");
  });
});
