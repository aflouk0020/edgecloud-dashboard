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

    render(<AlertsPage />);

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

    render(<AlertsPage />);

    expect(await screen.findByText("No Active Alerts"))
      .toBeInTheDocument();

    expect(screen.getByText("Everything is currently operating normally."))
      .toBeInTheDocument();
  });

  it("shows an error state when alerts cannot be loaded", async () => {
    getActiveAlerts.mockRejectedValue(new Error("API unavailable"));

    render(<AlertsPage />);

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

    render(<AlertsPage />);

    await screen.findByText("DEVICE_OFFLINE");

    await user.click(screen.getByText("Refresh"));

    await waitFor(() => {
      expect(getActiveAlerts).toHaveBeenCalledTimes(2);
    });
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

    render(<AlertsPage />);

    await screen.findByText("DEVICE_OFFLINE");

    await user.click(screen.getByText("Resolve Alert"));

    await waitFor(() => {
      expect(resolveAlert).toHaveBeenCalledWith("alert-1");
    });

    expect(await screen.findByText("No Active Alerts"))
      .toBeInTheDocument();
  });
});
