import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DevicesPage from "./DevicesPage";
import { getDevices } from "../../services/deviceService";

vi.mock("../../services/deviceService", () => ({
  getDevices: vi.fn()
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

describe("DevicesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("filters devices by search, status, and device type", async () => {
    const user = userEvent.setup();
    getDevices.mockResolvedValue(mockDevices);

    render(React.createElement(DevicesPage));

    expect(await screen.findByText("raspberry-pi-01"))
      .toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText("Device status"),
      "OFFLINE"
    );

    expect(screen.getByText("simulator-01")).toBeInTheDocument();
    expect(screen.queryByText("raspberry-pi-01")).not.toBeInTheDocument();

    await user.click(screen.getByText("Clear filters"));
    await user.selectOptions(
      screen.getByLabelText("Device type"),
      "RASPBERRY_PI"
    );

    expect(screen.getByText("raspberry-pi-01")).toBeInTheDocument();
    expect(screen.queryByText("simulator-01")).not.toBeInTheDocument();

    await user.click(screen.getByText("Clear filters"));
    await user.type(
      screen.getByLabelText("Device name, IP, or ID"),
      "192.168.1.12"
    );

    expect(screen.getByText("simulator-01")).toBeInTheDocument();
    expect(screen.queryByText("raspberry-pi-01")).not.toBeInTheDocument();
  });

  it("shows a filtered empty state", async () => {
    const user = userEvent.setup();
    getDevices.mockResolvedValue(mockDevices);

    render(React.createElement(DevicesPage));

    await screen.findByText("raspberry-pi-01");
    await user.type(
      screen.getByLabelText("Device name, IP, or ID"),
      "unknown-device"
    );

    expect(screen.getByText("No Matching Devices")).toBeInTheDocument();
  });
});
