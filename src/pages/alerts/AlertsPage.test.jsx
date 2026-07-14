import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

import AlertsPage from "./AlertsPage";
import {
  getActiveAlerts,
  resolveAlert
} from "../../services/alertService";

vi.mock("../../services/alertService", () => ({
  getActiveAlerts: vi.fn(),
  resolveAlert: vi.fn()
}));

const mockAlerts = [
  {
    id: "alert-1",
    alertType: "DEVICE_OFFLINE",
    severity: "HIGH",
    message: "Device is OFFLINE",
    sourceService: "raspberry-pi-01",
    status: "ACTIVE",
    resolved: false,
    createdAt: "2026-06-23T15:30:00"
  }
];

describe("AlertsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders active alerts from the Alert Service", async () => {
    getActiveAlerts.mockResolvedValue(mockAlerts);

    render(React.createElement(AlertsPage));

    expect(screen.getByText("Loading current platform incidents..."))
      .toBeInTheDocument();

    expect(await screen.findByText("Active Alerts"))
      .toBeInTheDocument();

    expect(screen.getByText("DEVICE_OFFLINE")).toBeInTheDocument();
    expect(screen.getByText("Device is OFFLINE")).toBeInTheDocument();
    expect(screen.getByText("raspberry-pi-01")).toBeInTheDocument();
    expect(screen.getByText("HIGH")).toBeInTheDocument();
  });

  it("shows an empty state when there are no active alerts", async () => {
    getActiveAlerts.mockResolvedValue([]);

    render(React.createElement(AlertsPage));

    expect(await screen.findByText("No Active Alerts"))
      .toBeInTheDocument();

    expect(screen.getByText("Everything is currently operating normally."))
      .toBeInTheDocument();
  });

  it("shows an error state when alerts cannot be loaded", async () => {
    getActiveAlerts.mockRejectedValue(new Error("API unavailable"));

    render(React.createElement(AlertsPage));

    expect(await screen.findByText("Unable to complete request"))
      .toBeInTheDocument();

    expect(
      screen.getByText(
        "Unable to load active alerts. Please verify that the Alert Service and API Gateway are running."
      )
    ).toBeInTheDocument();
  });

  it("refreshes the active alerts list", async () => {
    const user = userEvent.setup();

    getActiveAlerts.mockResolvedValue(mockAlerts);

    render(React.createElement(AlertsPage));

    await screen.findByText("DEVICE_OFFLINE");

    await user.click(screen.getByText("Refresh"));

    await waitFor(() => {
      expect(getActiveAlerts).toHaveBeenCalledTimes(2);
    });
  });

  it("filters alerts by severity, type, and search text", async () => {
    const user = userEvent.setup();

    getActiveAlerts.mockResolvedValue([
      mockAlerts[0],
      {
        id: "alert-2",
        alertType: "HIGH_LATENCY",
        severity: "MEDIUM",
        message: "Monitoring Service latency is above threshold",
        sourceService: "monitoring-service",
        status: "ACTIVE",
        resolved: false,
        createdAt: "2026-06-23T15:35:00"
      }
    ]);

    render(React.createElement(AlertsPage));

    await screen.findByText("DEVICE_OFFLINE");

    await user.selectOptions(
      screen.getByLabelText("Severity"),
      "MEDIUM"
    );

    expect(screen.getByText("HIGH_LATENCY")).toBeInTheDocument();
    expect(screen.queryByText("DEVICE_OFFLINE")).not.toBeInTheDocument();

    await user.click(screen.getByText("Clear filters"));
    await user.selectOptions(
      screen.getByLabelText("Alert type"),
      "DEVICE_OFFLINE"
    );

    expect(screen.getByText("DEVICE_OFFLINE")).toBeInTheDocument();
    expect(screen.queryByText("HIGH_LATENCY")).not.toBeInTheDocument();

    await user.click(screen.getByText("Clear filters"));
    await user.type(
      screen.getByLabelText("Message, source, or type"),
      "monitoring-service"
    );

    expect(screen.getByText("HIGH_LATENCY")).toBeInTheDocument();
    expect(screen.queryByText("DEVICE_OFFLINE")).not.toBeInTheDocument();
  });

  it("shows an empty state when filters have no matches", async () => {
    const user = userEvent.setup();
    getActiveAlerts.mockResolvedValue(mockAlerts);

    render(React.createElement(AlertsPage));

    await screen.findByText("DEVICE_OFFLINE");
    await user.type(
      screen.getByLabelText("Message, source, or type"),
      "database"
    );

    expect(screen.getByText("No Matching Alerts")).toBeInTheDocument();
  });

  it("resolves an active alert", async () => {
    const user = userEvent.setup();

    getActiveAlerts
      .mockResolvedValueOnce(mockAlerts)
      .mockResolvedValueOnce([]);

    resolveAlert.mockResolvedValue({
      ...mockAlerts[0],
      status: "RESOLVED",
      resolved: true
    });

    render(React.createElement(AlertsPage));

    await screen.findByText("DEVICE_OFFLINE");

    await user.click(screen.getByText("Resolve Alert"));

    await waitFor(() => {
      expect(resolveAlert).toHaveBeenCalledWith("alert-1");
    });

    expect(await screen.findByText("No Active Alerts"))
      .toBeInTheDocument();
  });
});
