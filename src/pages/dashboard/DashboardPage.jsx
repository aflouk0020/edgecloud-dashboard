import React, { useState } from "react";

import AnalyticsBreakdown from "../../components/analytics/AnalyticsBreakdown";
import AnalyticsKpiCard from "../../components/analytics/AnalyticsKpiCard";
import { PrimaryButton } from "../../components/ui/Buttons";
import LoadingState from "../../components/ui/LoadingState";
import PageHero from "../../components/ui/PageHero";
import {
  getAlertSummary,
  getDeviceSummary,
  getMonitoringAnalytics
} from "../../services/overviewService";

const EMPTY_MONITORING = {
  totalServiceChecks: 0,
  upServiceChecks: 0,
  downServiceChecks: 0,
  serviceUptimePercentage: 0,
  averageResponseTimeMs: 0,
  telemetrySamples: 0,
  averageCpuUsage: 0,
  averageMemoryUsage: 0,
  averageTemperature: 0
};

const EMPTY_DEVICES = {
  totalDevices: 0,
  onlineDevices: 0,
  offlineDevices: 0,
  availabilityPercentage: 0
};

const EMPTY_ALERTS = {
  totalAlerts: 0,
  activeAlerts: 0,
  resolvedAlerts: 0,
  lowSeverityAlerts: 0,
  mediumSeverityAlerts: 0,
  highSeverityAlerts: 0
};

function sourceValue(result, fallback) {
  return result.status === "fulfilled" ? result.value : fallback;
}

function failedSourceMessage(results) {
  const sourceNames = ["monitoring", "device", "alert"];
  const failures = results
    .map((result, index) => result.status === "rejected" ? sourceNames[index] : null)
    .filter(Boolean);

  if (failures.length === 0) {
    return "";
  }

  return `${failures.join(", ")} analytics source(s) are currently unavailable. Available metrics remain visible.`;
}

function fetchAnalytics() {
  return Promise.allSettled([
    getMonitoringAnalytics(),
    getDeviceSummary(),
    getAlertSummary()
  ]);
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState("");
  const [monitoring, setMonitoring] = useState(EMPTY_MONITORING);
  const [devices, setDevices] = useState(EMPTY_DEVICES);
  const [alerts, setAlerts] = useState(EMPTY_ALERTS);

  function applyResults(results) {
    setMonitoring(sourceValue(results[0], EMPTY_MONITORING));
    setDevices(sourceValue(results[1], EMPTY_DEVICES));
    setAlerts(sourceValue(results[2], EMPTY_ALERTS));
    setWarning(failedSourceMessage(results));
  }

  async function refreshAnalytics() {
    setLoading(true);

    try {
      applyResults(await fetchAnalytics());
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    let active = true;

    fetchAnalytics()
      .then(results => {
        if (!active) {
          return;
        }

        applyResults(results);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <LoadingState message="Calculating platform analytics..." />
    );
  }

  return (
    <section className="overview-page analytics-page">
      <PageHero
        eyebrow="Operational Intelligence"
        title="Platform Analytics"
        description="A consolidated view of availability, performance, telemetry health, and incident activity across EdgeCloud Monitor."
        action={
          <PrimaryButton onClick={refreshAnalytics}>
            Refresh Analytics
          </PrimaryButton>
        }
      />

      <div className="overview-warning" role="status">
        <strong>Project aggregation unavailable</strong>
        <span>
          Project-level aggregation is intentionally disabled until real project
          ownership data is available in the monitoring service. Service and
          device aggregation remain available below.
        </span>
      </div>

      {warning && (
        <div className="overview-warning" role="status">
          <strong>Partial analytics available</strong>
          <span>{warning}</span>
        </div>
      )}

      <div className="analytics-section-heading">
        <div>
          <p>Platform KPIs</p>
          <h3>Operational health at a glance</h3>
        </div>
        <span>Calculated from persisted platform records</span>
      </div>

      <div className="analytics-kpi-grid">
        <AnalyticsKpiCard
          eyebrow="Reliability"
          label="Service uptime"
          value={monitoring.serviceUptimePercentage}
          unit="%"
          progress={monitoring.serviceUptimePercentage}
          tone={monitoring.serviceUptimePercentage >= 95 ? "success" : "warning"}
          description={`${monitoring.upServiceChecks} successful checks from ${monitoring.totalServiceChecks} samples`}
        />

        <AnalyticsKpiCard
          eyebrow="Performance"
          label="Average response time"
          value={monitoring.averageResponseTimeMs}
          unit="ms"
          tone={monitoring.averageResponseTimeMs > 1000 ? "danger" : "info"}
          description="Mean latency across recorded service checks"
        />

        <AnalyticsKpiCard
          eyebrow="Edge Fleet"
          label="Device availability"
          value={devices.availabilityPercentage}
          unit="%"
          progress={devices.availabilityPercentage}
          tone={devices.availabilityPercentage >= 80 ? "success" : "warning"}
          description={`${devices.onlineDevices} of ${devices.totalDevices} registered devices online`}
        />

        <AnalyticsKpiCard
          eyebrow="Incidents"
          label="Active alerts"
          value={alerts.activeAlerts}
          tone={alerts.activeAlerts > 0 ? "danger" : "success"}
          description={`${alerts.resolvedAlerts} alerts resolved historically`}
        />
      </div>

      <div className="analytics-section-heading compact">
        <div>
          <p>Telemetry Averages</p>
          <h3>Edge resource profile</h3>
        </div>
        <span>{monitoring.telemetrySamples} telemetry samples analysed</span>
      </div>

      <div className="analytics-resource-grid">
        <AnalyticsKpiCard
          eyebrow="Compute"
          label="Average CPU usage"
          value={monitoring.averageCpuUsage}
          unit="%"
          progress={monitoring.averageCpuUsage}
          tone="info"
          description="Mean processor utilisation across telemetry history"
        />

        <AnalyticsKpiCard
          eyebrow="Memory"
          label="Average memory usage"
          value={monitoring.averageMemoryUsage}
          unit="%"
          progress={monitoring.averageMemoryUsage}
          tone="purple"
          description="Mean memory utilisation across telemetry history"
        />

        <AnalyticsKpiCard
          eyebrow="Thermal"
          label="Average temperature"
          value={monitoring.averageTemperature}
          unit="°C"
          tone="orange"
          description="Mean temperature reported by edge telemetry"
        />

        <AnalyticsKpiCard
          eyebrow="Resolution"
          label="Resolved alerts"
          value={alerts.resolvedAlerts}
          tone="success"
          description={`${alerts.totalAlerts} total alerts recorded by the platform`}
        />
      </div>

      <div className="analytics-section-heading compact">
        <div>
          <p>Distribution</p>
          <h3>Operational composition</h3>
        </div>
        <span>Current fleet state and historical monitoring outcomes</span>
      </div>

      <div className="analytics-breakdown-grid">
        <AnalyticsBreakdown
          eyebrow="Monitoring"
          title="Service checks"
          description="Successful and failed health-check samples."
          total={monitoring.totalServiceChecks}
          items={[
            { label: "UP", value: monitoring.upServiceChecks, tone: "success" },
            { label: "DOWN", value: monitoring.downServiceChecks, tone: "danger" }
          ]}
        />

        <AnalyticsBreakdown
          eyebrow="Devices"
          title="Fleet availability"
          description="Current connectivity across registered edge devices."
          total={devices.totalDevices}
          items={[
            { label: "ONLINE", value: devices.onlineDevices, tone: "success" },
            { label: "OFFLINE", value: devices.offlineDevices, tone: "warning" }
          ]}
        />

        <AnalyticsBreakdown
          eyebrow="Alerts"
          title="Severity profile"
          description="Distribution across all recorded platform alerts."
          total={alerts.totalAlerts}
          items={[
            { label: "HIGH", value: alerts.highSeverityAlerts, tone: "danger" },
            { label: "MEDIUM", value: alerts.mediumSeverityAlerts, tone: "warning" },
            { label: "LOW", value: alerts.lowSeverityAlerts, tone: "info" }
          ]}
        />
      </div>
    </section>
  );
}
