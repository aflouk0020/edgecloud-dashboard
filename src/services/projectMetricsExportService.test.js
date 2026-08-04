import { describe, expect, it, vi, beforeEach } from "vitest";

import { apiRequest } from "./apiClient";
import {
  exportProjectMetrics,
  getProjectMetricsExportFilename,
  normalizeProjectMetricsExportError
} from "./projectMetricsExportService";

vi.mock("./apiClient", () => ({
  apiRequest: vi.fn()
}));

describe("projectMetricsExportService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards repeated metricTypes and omits empty optional parameters", async () => {
    const response = {
      ok: true,
      blob: vi.fn().mockResolvedValue(new Blob(["csv"], { type: "text/csv" })),
      headers: {
        get: vi.fn().mockReturnValue('attachment; filename="edgecloud-metrics.csv"')
      }
    };

    apiRequest.mockResolvedValue(response);

    await exportProjectMetrics("project-1", {
      from: "2026-08-02T12:00:00.000Z",
      to: "2026-08-03T12:00:00.000Z",
      metricTypes: ["cpu", "", null, "memory"],
      deviceId: "",
      serviceId: undefined,
      sortDirection: "DESC"
    });

    expect(apiRequest).toHaveBeenCalledWith(
      "/api/v2/projects/project-1/metrics/export?from=2026-08-02T12%3A00%3A00.000Z&to=2026-08-03T12%3A00%3A00.000Z&sortDirection=DESC&metricTypes=cpu&metricTypes=memory",
      expect.objectContaining({ responseType: "raw" })
    );
  });

  it("extracts safe filenames from quoted, unquoted, and missing headers", () => {
    expect(getProjectMetricsExportFilename({
      headers: { get: vi.fn().mockReturnValue('attachment; filename="edgecloud-metrics-project.csv"') }
    })).toBe("edgecloud-metrics-project.csv");

    expect(getProjectMetricsExportFilename({
      headers: { get: vi.fn().mockReturnValue("attachment; filename=edgecloud-metrics-project.csv") }
    })).toBe("edgecloud-metrics-project.csv");

    expect(getProjectMetricsExportFilename({
      headers: { get: vi.fn().mockReturnValue('attachment; filename="../../evil.csv"') }
    })).toBe("____evil.csv");

    expect(getProjectMetricsExportFilename({
      headers: { get: vi.fn().mockReturnValue("") }
    })).toBe("edgecloud-project-metrics.csv");
  });

  it("maps export errors to safe feedback", () => {
    expect(normalizeProjectMetricsExportError({ status: 422 }).title).toBe("No exportable data");
    expect(normalizeProjectMetricsExportError({ status: 503 }).title).toBe("Export unavailable");
    expect(normalizeProjectMetricsExportError({ status: 403 }).message)
      .toContain("permission");
  });
});
