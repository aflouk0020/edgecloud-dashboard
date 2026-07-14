import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DashboardPage from "./DashboardPage";
import {
  getAlertSummary,
  getDeviceSummary,
  getMonitoringAnalytics
} from "../../services/overviewService";

vi.mock("../../services/overviewService", () => ({
  getMonitoringAnalytics: vi.fn(),
  getDeviceSummary: vi.fn(),
  getAlertSummary: vi.fn()
}));

const monitoringAnalytics = {
  totalServiceChecks: 200,
  upServiceChecks: 197,
  downServiceChecks: 3,
  serviceUptimePercentage: 98.5,
  averageResponseTimeMs: 145.75,
  telemetrySamples: 80,
  averageCpuUsage: 31.5,
  averageMemoryUsage: 62.25,
  averageTemperature: 54.4
};

const deviceSummary = {
  totalDevices: 5,
  onlineDevices: 4,
  offlineDevices: 1,
  availabilityPercentage: 80
};

const alertSummary = {
  totalAlerts: 10,
  activeAlerts: 4,
  resolvedAlerts: 6,
  lowSeverityAlerts: 2,
  mediumSeverityAlerts: 3,
  highSeverityAlerts: 5
};

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMonitoringAnalytics.mockResolvedValue(monitoringAnalytics);
    getDeviceSummary.mockResolvedValue(deviceSummary);
    getAlertSummary.mockResolvedValue(alertSummary);
  });

  it("displays platform KPIs, telemetry averages, and distributions", async () => {
    render(React.createElement(DashboardPage));

    expect(await screen.findByText("Platform Analytics"))
      .toBeInTheDocument();

    const uptimeCard = screen.getByText("Service uptime").closest("article");
    expect(within(uptimeCard).getByText("98.5")).toBeInTheDocument();
    expect(within(uptimeCard).getByText("%")).toBeInTheDocument();

    const latencyCard = screen
      .getByText("Average response time")
      .closest("article");
    expect(within(latencyCard).getByText("145.75")).toBeInTheDocument();
    expect(within(latencyCard).getByText("ms")).toBeInTheDocument();

    expect(screen.getByText("Average CPU usage")).toBeInTheDocument();
    expect(screen.getByText("Average memory usage")).toBeInTheDocument();
    expect(screen.getByText("Average temperature")).toBeInTheDocument();
    expect(screen.getByText("Resolved alerts")).toBeInTheDocument();

    const severityCard = screen.getByText("Severity profile").closest("article");
    expect(within(severityCard).getByText("HIGH")).toBeInTheDocument();
    expect(within(severityCard).getByText("MEDIUM")).toBeInTheDocument();
    expect(within(severityCard).getByText("LOW")).toBeInTheDocument();
  });

  it("keeps available metrics visible when one analytics source fails", async () => {
    getAlertSummary.mockRejectedValue(new Error("Alert service unavailable"));

    render(React.createElement(DashboardPage));

    expect(await screen.findByText("Partial analytics available"))
      .toBeInTheDocument();
    expect(screen.getByText(/alert analytics source/)).toBeInTheDocument();
    expect(screen.getByText("98.5")).toBeInTheDocument();
  });

  it("refreshes all analytics sources", async () => {
    const user = userEvent.setup();

    render(React.createElement(DashboardPage));

    await screen.findByText("Platform Analytics");
    await user.click(screen.getByRole("button", { name: "Refresh Analytics" }));
    await screen.findByText("Platform Analytics");

    expect(getMonitoringAnalytics).toHaveBeenCalledTimes(2);
    expect(getDeviceSummary).toHaveBeenCalledTimes(2);
    expect(getAlertSummary).toHaveBeenCalledTimes(2);
  });
});
