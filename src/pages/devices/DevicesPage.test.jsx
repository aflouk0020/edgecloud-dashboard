import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DevicesPage from "./DevicesPage";
import { getDeviceAggregation } from "../../services/metricAggregationService";
import { getDevices } from "../../services/deviceService";

vi.mock("../../services/deviceService", () => ({
  getDevices: vi.fn()
}));

vi.mock("../../services/metricAggregationService", () => ({
  getDeviceAggregation: vi.fn()
}));

const mockDevices = [
  {
    id: "device-1",
    deviceName: "raspberry-pi-01",
    deviceType: "RASPBERRY_PI",
    ipAddress: "192.168.1.11",
    status: "ONLINE",
    registeredAt: "2026-07-14T10:00:00",
    lastHeartbeat: "2026-07-14T10:10:00"
  },
  {
    id: "device-2",
    deviceName: "simulator-01",
    deviceType: "SIMULATED",
    ipAddress: "192.168.1.12",
    status: "OFFLINE",
    registeredAt: "2026-07-14T10:00:00",
    lastHeartbeat: "2026-07-14T10:05:00"
  }
];

const aggregationResponse = {
  scope: "DEVICE",
  serviceId: null,
  deviceId: "device-1",
  projectId: null,
  dateRange: { from: null, to: null, openEnded: true },
  emptyResult: false,
  summaries: [
    {
      scope: "DEVICE",
      metrics: {
        averageValue: 31.5,
        minimumValue: 20,
        maximumValue: 42,
        latestValue: 34,
        sampleCount: 2
      },
      availability: {
        totalSamples: 2,
        availableSamples: 2,
        unavailableSamples: 0,
        availabilityPercentage: 100,
        latestRecordedAt: "2026-07-14T10:10:00"
      },
      series: []
    }
  ]
};

describe("DevicesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDeviceAggregation.mockResolvedValue(aggregationResponse);
  });

  it("filters devices by search, status, and device type", async () => {
    const user = userEvent.setup();
    getDevices.mockResolvedValue(mockDevices);

    render(React.createElement(DevicesPage));

    expect((await screen.findAllByText("raspberry-pi-01"))[0])
      .toBeInTheDocument();
    expect(await screen.findByText("Aggregation spotlight"))
      .toBeInTheDocument();
    expect(screen.getByText("Average CPU usage")).toBeInTheDocument();
    expect(screen.getAllByText("31.5")[0]).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText("Device status"),
      "OFFLINE"
    );

    expect(screen.getAllByText("simulator-01")[0]).toBeInTheDocument();
    expect(screen.queryByText("raspberry-pi-01")).not.toBeInTheDocument();

    await user.click(screen.getByText("Clear filters"));
    await user.selectOptions(
      screen.getByLabelText("Device type"),
      "RASPBERRY_PI"
    );

    expect(screen.getAllByText("raspberry-pi-01")[0]).toBeInTheDocument();
    expect(screen.queryByText("simulator-01")).not.toBeInTheDocument();

    await user.click(screen.getByText("Clear filters"));
    await user.type(
      screen.getByLabelText("Device name, IP, or ID"),
      "192.168.1.12"
    );

    expect(screen.getAllByText("simulator-01")[0]).toBeInTheDocument();
    expect(screen.queryByText("raspberry-pi-01")).not.toBeInTheDocument();
  });

  it("shows a filtered empty state", async () => {
    const user = userEvent.setup();
    getDevices.mockResolvedValue(mockDevices);

    render(React.createElement(DevicesPage));

    await screen.findAllByText("raspberry-pi-01");
    await user.type(
      screen.getByLabelText("Device name, IP, or ID"),
      "unknown-device"
    );

    expect(screen.getByText("No Matching Devices")).toBeInTheDocument();
  });
});
