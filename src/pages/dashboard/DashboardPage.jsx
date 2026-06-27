import { useEffect, useState } from "react";

import PageHero from "../../components/ui/PageHero";
import StatCard from "../../components/ui/StatCard";
import LoadingState from "../../components/ui/LoadingState";

import {
  getActiveAlerts,
  getDevices,
  getTelemetryHistory
} from "../../services/overviewService";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState("");

  const [devices, setDevices] = useState([]);
  const [telemetry, setTelemetry] = useState([]);
  const [serviceMetrics, setServiceMetrics] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    async function loadDashboard() {
      const results = await Promise.allSettled([
        getDevices(),
        getTelemetryHistory(),
        getActiveAlerts()
      ]);

      if (results[0].status === "fulfilled") {
        setDevices(results[0].value);
      }

      if (results[1].status === "fulfilled") {
        setTelemetry(results[1].value.telemetryMetrics || []);
        setServiceMetrics(results[1].value.serviceMetrics || []);
      }

      if (results[2].status === "fulfilled") {
        setAlerts(Array.isArray(results[2].value) ? results[2].value : []);
      }

      const failedRequests =
        results.filter(result => result.status === "rejected").length;

      if (failedRequests > 0) {
        setWarning(
          `${failedRequests} dashboard data source(s) are currently unavailable.`
        );
      }

      setLoading(false);
    }

    loadDashboard();
  }, []);

  const onlineDevices =
    devices.filter(device => device.status === "ONLINE").length;

  const offlineDevices =
    devices.filter(device => device.status === "OFFLINE").length;

  const servicesDown =
    serviceMetrics.filter(metric => metric.uptimeStatus === "DOWN").length;

  const highAlerts =
    alerts.filter(alert => alert.severity === "HIGH").length;

  if (loading) {
    return (
      <LoadingState message="Loading live operational status..." />
    );
  }

  return (
    <section className="overview-page">

      <PageHero
        eyebrow="Platform Overview"
        title="System Overview"
        description="Live summary of edge devices, telemetry records, service health, and active incidents."
      />

      {warning && (
        <div className="overview-warning">
          {warning}
        </div>
      )}

      <div className="overview-grid">

        <StatCard
          title="Registered Devices"
          value={devices.length}
        />

        <StatCard
          title="Online Devices"
          value={onlineDevices}
          variant="success"
        />

        <StatCard
          title="Offline Devices"
          value={offlineDevices}
          variant="danger"
        />

        <StatCard
          title="Telemetry Records"
          value={telemetry.length}
        />

        <StatCard
          title="Service Metrics"
          value={serviceMetrics.length}
        />

        <StatCard
          title="Recorded Failures"
          value={servicesDown}
          variant="warning"
        />

        <StatCard
          title="Active Alerts"
          value={alerts.length}
          variant="danger"
        />

        <StatCard
          title="High Severity Alerts"
          value={highAlerts}
          variant="danger"
        />

      </div>

    </section>
  );
}
