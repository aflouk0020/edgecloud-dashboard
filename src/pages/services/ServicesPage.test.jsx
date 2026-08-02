import {
  render,
  screen,
  waitFor,
  within
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

import ServicesPage from "./ServicesPage";
import { getServiceAggregation } from "../../services/metricAggregationService";
import {
  getMonitoredServices,
  getServiceAvailability
} from "../../services/serviceMonitoringService";

vi.mock("../../services/serviceMonitoringService", () => ({
  getMonitoredServices: vi.fn(),
  getServiceAvailability: vi.fn()
}));

vi.mock("../../services/metricAggregationService", () => ({
  getServiceAggregation: vi.fn()
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

const availabilityById = {
  "service-1": {
    serviceId: "service-1",
    serviceName: "monitoring-service",
    currentStatus: "UP",
    totalChecks: 100,
    upChecks: 99,
    downChecks: 1,
    uptimePercentage: 99,
    averageResponseTimeMs: 125.5,
    downtimeEventCount: 1,
    totalDowntimeSeconds: 60,
    lastDowntimeStartedAt: "2026-07-20T14:00:00",
    lastRecoveredAt: "2026-07-20T14:01:00",
    currentlyDown: false
  },
  "service-2": {
    serviceId: "service-2",
    serviceName: "device-service",
    currentStatus: "DOWN",
    totalChecks: 40,
    upChecks: 30,
    downChecks: 10,
    uptimePercentage: 75,
    averageResponseTimeMs: 820,
    downtimeEventCount: 3,
    totalDowntimeSeconds: 540,
    lastDowntimeStartedAt: "2026-07-20T15:00:00",
    lastRecoveredAt: null,
    currentlyDown: true
  }
};

const aggregationResponse = {
  scope: "SERVICE",
  serviceId: "service-1",
  deviceId: null,
  projectId: null,
  dateRange: { from: null, to: null, openEnded: true },
  emptyResult: false,
  summaries: [
    {
      scope: "SERVICE",
      metrics: {
        averageValue: 125.5,
        minimumValue: 100,
        maximumValue: 150,
        latestValue: 128,
        sampleCount: 2
      },
      availability: {
        totalSamples: 2,
        availableSamples: 2,
        unavailableSamples: 0,
        availabilityPercentage: 100,
        latestRecordedAt: "2026-07-20T15:01:00"
      },
      series: []
    }
  ]
};

  function mockSuccessfulReliability() {
    getServiceAvailability.mockImplementation(
      serviceId => Promise.resolve(availabilityById[serviceId])
    );
  }

  function mockSuccessfulAggregation() {
    getServiceAggregation.mockResolvedValue(aggregationResponse);
  }

describe("ServicesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("displays historical reliability metrics for monitored services", async () => {
    getMonitoredServices.mockResolvedValue(mockServices);
    mockSuccessfulReliability();
    mockSuccessfulAggregation();

    render(<ServicesPage />);

    const monitoringProgress = await screen.findByRole(
      "progressbar",
      { name: "monitoring-service uptime" }
    );

    expect(monitoringProgress)
      .toHaveAttribute("aria-valuenow", "99");

    const monitoringCard = screen
      .getAllByText("monitoring-service")[1]
      .closest(".incident-card");

    expect(
      within(monitoringCard).getByText("Historical reliability")
    ).toBeInTheDocument();

    expect(
      within(monitoringCard).getByText("AVAILABLE")
    ).toBeInTheDocument();

    expect(
      within(monitoringCard).getByText("125.5")
    ).toBeInTheDocument();

    expect(
      await screen.findByText("Aggregation spotlight")
    ).toBeInTheDocument();
    expect(screen.getByText("Average response time")).toBeInTheDocument();
    expect(screen.getAllByText("125.5")[0]).toBeInTheDocument();
  });

  it("filters monitored services by name and status", async () => {
    const user = userEvent.setup();

    getMonitoredServices.mockResolvedValue(mockServices);
    mockSuccessfulReliability();
    mockSuccessfulAggregation();

    render(<ServicesPage />);

    expect(
      (await screen.findAllByText("monitoring-service"))[0]
    ).toBeInTheDocument();

    expect(screen.getAllByText("device-service")[0])
      .toBeInTheDocument();

    await user.type(
      screen.getByLabelText("Service name or URL"),
      "monitoring"
    );

    expect(screen.getAllByText("monitoring-service")[1])
      .toBeInTheDocument();

    expect(screen.queryByText("device-service"))
      .not.toBeInTheDocument();

    await user.click(screen.getByText("Clear filters"));

    await user.selectOptions(
      screen.getByLabelText("Health status"),
      "DOWN"
    );

    const serviceList = screen
      .getAllByText("device-service")[1]
      .closest(".incident-list");

    expect(
      within(serviceList).getByText("device-service")
    ).toBeInTheDocument();

    expect(
      within(serviceList).queryByText("monitoring-service")
    ).not.toBeInTheDocument();
  });

  it("shows a no-history fallback when no checks exist", async () => {
    getMonitoredServices.mockResolvedValue([mockServices[0]]);
    mockSuccessfulAggregation();

    getServiceAvailability.mockResolvedValue({
      ...availabilityById["service-1"],
      totalChecks: 0,
      upChecks: 0,
      downChecks: 0,
      uptimePercentage: 0,
      averageResponseTimeMs: 0,
      downtimeEventCount: 0,
      totalDowntimeSeconds: 0,
      lastDowntimeStartedAt: null,
      lastRecoveredAt: null
    });

    render(<ServicesPage />);

    expect(
      await screen.findByText("No reliability history yet")
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Uptime metrics will appear after the first health-check samples are recorded."
      )
    ).toBeInTheDocument();
  });

  it("shows a reliability error without hiding service health and supports retry", async () => {
    const user = userEvent.setup();

    getMonitoredServices.mockResolvedValue([mockServices[0]]);
    mockSuccessfulAggregation();

    getServiceAvailability
      .mockRejectedValueOnce(new Error("Unavailable"))
      .mockResolvedValueOnce(availabilityById["service-1"]);

    render(<ServicesPage />);

    expect(
      await screen.findByText("Reliability data unavailable")
    ).toBeInTheDocument();

    expect(screen.getAllByText("monitoring-service")[1])
      .toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Retry Reliability"
      })
    );

    await waitFor(() => {
      expect(
        screen.getByRole("progressbar", {
          name: "monitoring-service uptime"
        })
      ).toHaveAttribute("aria-valuenow", "99");
    });

    expect(getServiceAvailability).toHaveBeenCalledTimes(2);
  });

  it("shows a filtered empty state", async () => {
    const user = userEvent.setup();

    getMonitoredServices.mockResolvedValue(mockServices);
    mockSuccessfulReliability();
    mockSuccessfulAggregation();

    render(<ServicesPage />);

    await screen.findAllByText("monitoring-service");

    await user.type(
      screen.getByLabelText("Service name or URL"),
      "missing-service"
    );

    expect(
      screen.getByText("No Matching Services")
    ).toBeInTheDocument();
  });

  it("shows an API error state when monitored services cannot load", async () => {
    getMonitoredServices.mockRejectedValue(
      new Error("Unavailable")
    );

    render(<ServicesPage />);

    expect(
      await screen.findByText("Unable to complete request")
    ).toBeInTheDocument();

    expect(getServiceAvailability).not.toHaveBeenCalled();
  });
});
