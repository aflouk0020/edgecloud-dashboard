import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "./apiClient";
import {
  acknowledgeAlert,
  getAlertOwnershipHistory,
  getProjectAlert,
  listProjectAlerts,
  normalizeProjectAlertEventError,
  releaseAlertOwnership
} from "./projectAlertEventService";

vi.mock("./apiClient", () => ({ apiRequest: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe("projectAlertEventService", () => {
  it("forwards bounded server filters and normalizes the paginated response", async () => {
    apiRequest.mockResolvedValue({ content: [{ alertId: "alert-1" }], page: 2, size: 100, totalElements: 201, totalPages: 3 });

    const result = await listProjectAlerts("project 1", {
      status: "OPEN", severity: "HIGH", sourceType: "DEVICE", sourceId: "device-1", ownerId: "11111111-1111-4111-8111-111111111111",
      from: "2026-08-01T00:00:00Z", to: "2026-08-10T00:00:00Z", page: 2, size: 500, sortDirection: "DESC"
    });

    const request = apiRequest.mock.calls[0][0];
    expect(request).toContain("/api/v2/projects/project%201/alerts?");
    expect(request).toContain("status=OPEN");
    expect(request).toContain("severity=HIGH");
    expect(request).toContain("sourceType=DEVICE");
    expect(request).toContain("sourceId=device-1");
    expect(request).toContain("ownerId=11111111-1111-4111-8111-111111111111");
    expect(request).toContain("page=2");
    expect(request).toContain("size=100");
    expect(request).toContain("sortDirection=DESC");
    expect(result.alerts[0].id).toBe("alert-1");
  });

  it("uses project-scoped detail paths and normalizes authorization errors", async () => {
    apiRequest.mockResolvedValue({ alertId: "alert/1", status: "OPEN" });
    await expect(getProjectAlert("project/1", "alert/1")).resolves.toMatchObject({ id: "alert/1" });
    expect(apiRequest).toHaveBeenCalledWith("/api/v2/projects/project%2F1/alerts/alert%2F1");
    expect(normalizeProjectAlertEventError(new Error("API request failed: 403"))).toMatchObject({ status: 403, title: "Access denied" });
  });

  it("uses project-scoped ownership mutation and history paths", async () => {
    apiRequest.mockResolvedValueOnce({ alertId: "alert-1", status: "ACKNOWLEDGED" });
    await acknowledgeAlert("project-1", "alert-1");
    expect(apiRequest).toHaveBeenLastCalledWith("/api/v2/projects/project-1/alerts/alert-1/acknowledgement", { method: "POST" });

    apiRequest.mockResolvedValueOnce({ alertId: "alert-1", status: "OPEN" });
    await releaseAlertOwnership("project-1", "alert-1");
    expect(apiRequest).toHaveBeenLastCalledWith("/api/v2/projects/project-1/alerts/alert-1/acknowledgement", { method: "DELETE" });

    apiRequest.mockResolvedValueOnce([{ id: "history-1", action: "ACKNOWLEDGED" }]);
    await expect(getAlertOwnershipHistory("project-1", "alert-1")).resolves.toHaveLength(1);
    expect(apiRequest).toHaveBeenLastCalledWith("/api/v2/projects/project-1/alerts/alert-1/ownership-history");
  });

  it("normalizes ownership conflicts safely", () => {
    expect(normalizeProjectAlertEventError(new Error("API request failed: 409"))).toMatchObject({ status: 409, title: "Alert ownership changed" });
  });
});
