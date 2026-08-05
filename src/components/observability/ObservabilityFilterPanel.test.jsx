import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ObservabilityFilterPanel from "./ObservabilityFilterPanel";

describe("ObservabilityFilterPanel", () => {
  it("renders controls and debounces search updates", async () => {
    const onSearchChange = vi.fn();
    const onClearFilters = vi.fn();

    render(
      <ObservabilityFilterPanel
        searchEnabled
        searchValue="alpha"
        onSearchChange={onSearchChange}
        serviceId="service-1"
        serviceOptions={[{ value: "service-1", label: "Service 1" }]}
        onServiceIdChange={vi.fn()}
        deviceId="device-1"
        deviceOptions={[{ value: "device-1", label: "Device 1" }]}
        onDeviceIdChange={vi.fn()}
        metricTypes={["cpu"]}
        metricTypeOptions={[{ value: "cpu", label: "CPU" }]}
        onMetricTypesChange={vi.fn()}
        serviceHealthStatuses={["HEALTHY"]}
        serviceHealthStatusOptions={[{ value: "HEALTHY", label: "Healthy" }]}
        onServiceHealthStatusesChange={vi.fn()}
        deviceHealthStatuses={["OFFLINE"]}
        deviceHealthStatusOptions={[{ value: "OFFLINE", label: "Offline" }]}
        onDeviceHealthStatusesChange={vi.fn()}
        from="2026-08-04T00:00"
        to="2026-08-04T12:00"
        dateRangeEnabled
        onDateRangeChange={vi.fn()}
        sortDirection="DESC"
        sortOptions={[{ value: "DESC", label: "Newest first" }]}
        onSortDirectionChange={vi.fn()}
        activeFilterCount={5}
        hasActiveFilters
        onClearFilters={onClearFilters}
      />
    );

    expect(screen.getByText("Refine observability data")).toBeInTheDocument();
    expect(screen.getByText("5", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("active filters")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search"), {
      target: { value: "beta" }
    });

    await waitFor(() => {
      expect(onSearchChange).toHaveBeenCalledWith("beta");
    });

    expect(screen.getByLabelText("Service")).toHaveValue("service-1");
    expect(screen.getByLabelText("Device")).toHaveValue("device-1");
    expect(screen.getByLabelText("Metric types")).toBeInTheDocument();
    expect(screen.getByLabelText("Service health")).toBeInTheDocument();
    expect(screen.getByLabelText("Device health")).toBeInTheDocument();
    expect(screen.getByLabelText("From")).toHaveValue("2026-08-04T00:00");
    expect(screen.getByLabelText("To")).toHaveValue("2026-08-04T12:00");

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onClearFilters).toHaveBeenCalled();
  });
});
