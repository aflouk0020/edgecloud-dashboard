import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ServicesPage from "./ServicesPage";
import { getMonitoredServices } from "../../services/serviceMonitoringService";

vi.mock("../../services/serviceMonitoringService", () => ({
  getMonitoredServices: vi.fn()
}));

const mockServices = [
  {
    id: "service-1",
    serviceName: "monitoring-service",
    serviceUrl: "http://monitoring-service:8082",
    status: "UP",
    createdAt: "2026-07-14T10:00:00"
  },
  {
    id: "service-2",
    serviceName: "device-service",
    serviceUrl: "http://device-service:8083",
    status: "DOWN",
    createdAt: "2026-07-14T10:05:00"
  }
];

describe("ServicesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("filters monitored services by name and status", async () => {
    const user = userEvent.setup();
    getMonitoredServices.mockResolvedValue(mockServices);

    render(React.createElement(ServicesPage));

    expect(await screen.findByText("monitoring-service"))
      .toBeInTheDocument();
    expect(screen.getByText("device-service")).toBeInTheDocument();

    await user.type(
      screen.getByLabelText("Service name or URL"),
      "monitoring"
    );

    expect(screen.getByText("monitoring-service")).toBeInTheDocument();
    expect(screen.queryByText("device-service")).not.toBeInTheDocument();

    await user.click(screen.getByText("Clear filters"));
    await user.selectOptions(
      screen.getByLabelText("Health status"),
      "DOWN"
    );

    const serviceList = screen.getByText("device-service")
      .closest(".incident-list");

    expect(within(serviceList).getByText("device-service"))
      .toBeInTheDocument();
    expect(within(serviceList).queryByText("monitoring-service"))
      .not.toBeInTheDocument();
  });

  it("shows a filtered empty state", async () => {
    const user = userEvent.setup();
    getMonitoredServices.mockResolvedValue(mockServices);

    render(React.createElement(ServicesPage));

    await screen.findByText("monitoring-service");
    await user.type(
      screen.getByLabelText("Service name or URL"),
      "missing-service"
    );

    expect(screen.getByText("No Matching Services")).toBeInTheDocument();
  });

  it("shows an API error state", async () => {
    getMonitoredServices.mockRejectedValue(new Error("Unavailable"));

    render(React.createElement(ServicesPage));

    expect(await screen.findByText("Unable to complete request"))
      .toBeInTheDocument();
  });
});
