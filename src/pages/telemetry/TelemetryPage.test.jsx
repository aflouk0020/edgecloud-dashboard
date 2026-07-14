import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import TelemetryPage from "./TelemetryPage";
import { getTelemetryHistory } from "../../services/telemetryService";

vi.mock("../../services/telemetryService", () => ({
  getTelemetryHistory: vi.fn()
}));

vi.mock("../../components/charts/HistoricalLineChart", () => ({
  default: ({ title, data }) => (
    <div data-testid={`chart-${title}`}>{data.length} chart records</div>
  )
}));

const mockHistory = {
  telemetryMetrics: [
    {
      id: "metric-1",
      deviceId: "raspberry-pi-01",
      cpuUsage: 25,
      memoryUsage: 55,
      temperature: 48,
      heartbeatStatus: "ONLINE",
      recordedAt: "2026-07-14T10:00:00"
    },
    {
      id: "metric-2",
      deviceId: "simulator-01",
      cpuUsage: 80,
      memoryUsage: 70,
      temperature: 75,
      heartbeatStatus: "OFFLINE",
      recordedAt: "2026-07-14T10:05:00"
    }
  ],
  serviceMetrics: []
};

describe("TelemetryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("filters telemetry by device ID and heartbeat status", async () => {
    const user = userEvent.setup();
    getTelemetryHistory.mockResolvedValue(mockHistory);

    render(React.createElement(TelemetryPage));

    const table = await screen.findByRole("table");
    expect(within(table).getByText("raspberry-pi-01")).toBeInTheDocument();
    expect(within(table).getByText("simulator-01")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Device ID"), "raspberry");

    expect(within(table).getByText("raspberry-pi-01")).toBeInTheDocument();
    expect(within(table).queryByText("simulator-01")).not.toBeInTheDocument();

    await user.click(screen.getByText("Clear filters"));
    await user.selectOptions(
      screen.getByLabelText("Heartbeat status"),
      "OFFLINE"
    );

    expect(within(table).getByText("simulator-01")).toBeInTheDocument();
    expect(within(table).queryByText("raspberry-pi-01"))
      .not.toBeInTheDocument();
  });

  it("shows a filtered empty state", async () => {
    const user = userEvent.setup();
    getTelemetryHistory.mockResolvedValue(mockHistory);

    render(React.createElement(TelemetryPage));

    await screen.findByRole("table");
    await user.type(screen.getByLabelText("Device ID"), "missing-device");

    expect(screen.getByText("No Matching Telemetry")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
