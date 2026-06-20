import { useEffect, useState } from "react";

import SummaryCard from "../../components/common/SummaryCard";

import {
  getDevices,
  getTelemetryHistory
} from "../../services/overviewService";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState("");

  const [devices, setDevices] = useState([]);
  const [telemetry, setTelemetry] = useState([]);
  const [serviceMetrics, setServiceMetrics] = useState([]);

  useEffect(() => {
    async function loadDashboard() {
      const results = await Promise.allSettled([
        getDevices(),
        getTelemetryHistory()
      ]);

      if (results[0].status === "fulfilled") {
        setDevices(results[0].value);
      }

      if (results[1].status === "fulfilled") {
        setTelemetry(results[1].value.telemetryMetrics || []);
        setServiceMetrics(results[1].value.serviceMetrics || []);
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

  if (loading) {
    return <h2>Loading dashboard...</h2>;
  }

  const onlineDevices =
    devices.filter(device => device.status === "ONLINE").length;

  const offlineDevices =
    devices.filter(device => device.status === "OFFLINE").length;

  const servicesDown =
    serviceMetrics.filter(metric => metric.uptimeStatus === "DOWN").length;

  return (
    <>
      <h1>System Overview</h1>

      {warning && (
        <p>{warning}</p>
      )}

      <div className="dashboard-grid">
        <SummaryCard
          title="Registered Devices"
          value={devices.length}
        />

        <SummaryCard
          title="Online Devices"
          value={onlineDevices}
        />

        <SummaryCard
          title="Offline Devices"
          value={offlineDevices}
        />

        <SummaryCard
          title="Telemetry Records"
          value={telemetry.length}
        />

        <SummaryCard
          title="Service Metrics"
          value={serviceMetrics.length}
        />

        <SummaryCard
          title="Recorded Service Failures"
          value={servicesDown}
        />

        <SummaryCard
          title="Active Alerts"
          value="Unavailable"
        />
      </div>
    </>
  );
}
