import React from "react";
import { BrowserRouter, Link, Route, Routes, useLocation } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useObservabilityFilters } from "./useObservabilityFilters";

function TestHarness() {
  const location = useLocation();
  const {
    filters,
    setSearch,
    setServiceId,
    setDeviceId,
    setMetricTypes,
    setServiceHealthStatuses,
    setDeviceHealthStatuses,
    setDateRange,
    setSortDirection,
    removeFilter,
    clearFilters,
    hasActiveFilters,
    activeFilterCount
  } = useObservabilityFilters();

  return (
    <div>
      <p data-testid="pathname">{location.pathname}</p>
      <p data-testid="search">{location.search}</p>
      <p data-testid="filters">{JSON.stringify(filters)}</p>
      <p data-testid="active">{String(hasActiveFilters)}</p>
      <p data-testid="count">{String(activeFilterCount)}</p>
      <button type="button" onClick={() => setSearch(" telemetry ")}>
        search
      </button>
      <button type="button" onClick={() => setServiceId("service-1")}>
        service
      </button>
      <button type="button" onClick={() => setDeviceId("device-1")}>
        device
      </button>
      <button type="button" onClick={() => setMetricTypes(["cpu", "memory"])}>
        metric
      </button>
      <button type="button" onClick={() => setServiceHealthStatuses(["HEALTHY"])}>
        service status
      </button>
      <button type="button" onClick={() => setDeviceHealthStatuses(["OFFLINE"])}>
        device status
      </button>
      <button type="button" onClick={() => setDateRange("2026-08-04T00:00", "2026-08-04T12:00")}>
        range
      </button>
      <button type="button" onClick={() => setSortDirection("ASC")}>
        sort
      </button>
      <button type="button" onClick={() => removeFilter("serviceId")}>
        remove service
      </button>
      <button type="button" onClick={() => clearFilters()}>
        clear
      </button>
      <Link to={{ pathname: "/projects/project-1/services", search: location.search }}>
        service nav
      </Link>
    </div>
  );
}

function renderPage(initialEntry = "/projects/project-1/workspace?q=alpha&keep=yes") {
  window.history.pushState({}, "", initialEntry);

  return render(
    <BrowserRouter>
      <Routes>
        <Route path="/projects/:projectId/workspace" element={<TestHarness />} />
        <Route path="/projects/:projectId/services" element={<div>services</div>} />
      </Routes>
    </BrowserRouter>
  );
}

describe("useObservabilityFilters", () => {
  beforeEach(() => {
    vi.spyOn(window.history, "replaceState");
    vi.spyOn(window.history, "pushState");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("treats the URL as the source of truth and preserves unrelated query params", async () => {
    renderPage();

    expect(screen.getByTestId("search")).toHaveTextContent("q=alpha&keep=yes");

    fireEvent.click(screen.getByRole("button", { name: "search" }));
    fireEvent.click(screen.getByRole("button", { name: "service" }));
    fireEvent.click(screen.getByRole("button", { name: "device" }));
    fireEvent.click(screen.getByRole("button", { name: "metric" }));
    fireEvent.click(screen.getByRole("button", { name: "service status" }));
    fireEvent.click(screen.getByRole("button", { name: "device status" }));
    fireEvent.click(screen.getByRole("button", { name: "range" }));
    fireEvent.click(screen.getByRole("button", { name: "sort" }));

    await waitFor(() => {
      expect(screen.getByTestId("count")).toHaveTextContent("10");
      expect(screen.getByTestId("active")).toHaveTextContent("true");
      expect(screen.getByTestId("search")).toHaveTextContent(
        "keep=yes&q=telemetry&service=service-1&device=device-1&metric=cpu&metric=memory&serviceStatus=HEALTHY&deviceStatus=OFFLINE&from=2026-08-04T00%3A00&to=2026-08-04T12%3A00&sort=ASC"
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "remove service" }));

    await waitFor(() => {
      expect(screen.getByTestId("search")).not.toHaveTextContent("service=service-1");
    });

    fireEvent.click(screen.getByRole("button", { name: "clear" }));

    await waitFor(() => {
      expect(screen.getByTestId("search")).toHaveTextContent("keep=yes");
      expect(screen.getByTestId("count")).toHaveTextContent("0");
    });
  });

  it("preserves the observability query string when navigating between project tabs", async () => {
    renderPage("/projects/project-1/workspace?q=alpha&service=service-1");

    fireEvent.click(screen.getByRole("link", { name: "service nav" }));

    await waitFor(() => {
      expect(screen.getByText("services")).toBeInTheDocument();
      expect(window.location.pathname).toBe("/projects/project-1/services");
      expect(window.location.search).toContain("q=alpha");
      expect(window.location.search).toContain("service=service-1");
    });
  });
});
