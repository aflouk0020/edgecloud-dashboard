import { describe, expect, it } from "vitest";

import {
  areObservabilityFiltersEqual,
  clearObservabilityFilters,
  countActiveObservabilityFilters,
  hasActiveObservabilityFilters,
  parseObservabilityFilters,
  removeObservabilityFilter,
  serializeObservabilityFilters
} from "./observabilityFilterParams";

describe("observabilityFilterParams", () => {
  it("parses, serializes and normalizes shared observability filters", () => {
    const parsed = parseObservabilityFilters(
      "?q=%20Telemetry%20&service=service-1&device=device-1&metric=cpu&metric=memory&serviceStatus=healthy&serviceStatus=invalid&deviceStatus=offline&from=2026-08-04T00:00:00Z&to=2026-08-04T12:00:00Z&sort=asc"
    );

    expect(parsed).toEqual({
      search: "Telemetry",
      serviceId: "service-1",
      deviceId: "device-1",
      metricTypes: ["cpu", "memory"],
      serviceHealthStatuses: ["HEALTHY"],
      deviceHealthStatuses: ["OFFLINE"],
      from: "2026-08-04T00:00:00Z",
      to: "2026-08-04T12:00:00Z",
      sortDirection: "ASC"
    });

    expect(serializeObservabilityFilters(parsed).toString()).toBe(
      "q=Telemetry&service=service-1&device=device-1&metric=cpu&metric=memory&serviceStatus=HEALTHY&deviceStatus=OFFLINE&from=2026-08-04T00%3A00%3A00Z&to=2026-08-04T12%3A00%3A00Z&sort=ASC"
    );
  });

  it("counts, detects, clears and removes active filters deterministically", () => {
    const filters = {
      search: "telemetry",
      serviceId: "service-1",
      deviceId: null,
      metricTypes: ["cpu", "memory"],
      serviceHealthStatuses: ["HEALTHY", "DEGRADED"],
      deviceHealthStatuses: ["OFFLINE"],
      from: "2026-08-04T00:00:00Z",
      to: null,
      sortDirection: "ASC"
    };

    expect(countActiveObservabilityFilters(filters)).toBe(9);
    expect(hasActiveObservabilityFilters(filters)).toBe(true);
    expect(areObservabilityFiltersEqual(filters, { ...filters })).toBe(true);

    expect(removeObservabilityFilter(filters, "search")).toMatchObject({ search: "" });
    expect(clearObservabilityFilters()).toMatchObject({
      search: "",
      serviceId: null,
      deviceId: null,
      metricTypes: [],
      serviceHealthStatuses: [],
      deviceHealthStatuses: [],
      from: null,
      to: null,
      sortDirection: "DESC"
    });
  });
});
