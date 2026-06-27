import { useEffect, useState } from "react";
import { getTelemetryHistory } from "../../services/telemetryService";

function formatDate(value) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatMetric(value, suffix) {
  if (value === null || value === undefined) {
    return "N/A";
  }

  return `${value}${suffix}`;
}

function statusClass(status) {
  return `device-status ${String(status || "").toLowerCase()}`;
}

export default function TelemetryPage() {
  const [telemetry, setTelemetry] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadTelemetry() {
    try {
      setLoading(true);
      setError("");

      const data = await getTelemetryHistory();
      setTelemetry(data.telemetryMetrics || []);
    } catch {
      setError("Unable to load telemetry metrics. Please verify the Monitoring Service is running.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTelemetry();
  }, []);

  const latest = telemetry[0];

  if (loading) {
    return (
      <section className="telemetry-page">
        <div className="page-hero">
          <div>
            <p className="eyebrow">Monitoring Service</p>
            <h2>Telemetry Metrics</h2>
            <p>Loading latest telemetry metrics...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="telemetry-page">
      <div className="page-hero">
        <div>
          <p className="eyebrow">Monitoring Service</p>
          <h2>Telemetry Metrics</h2>
          <p>
            Review CPU, memory, temperature, and heartbeat telemetry from edge devices.
          </p>
        </div>

        <button className="primary-action" onClick={loadTelemetry}>
          Refresh Metrics
        </button>
      </div>

      {error && (
        <div className="alert-error">
          <strong>Unable to complete request</strong>
          <p>{error}</p>
          <button onClick={loadTelemetry}>Retry</button>
        </div>
      )}

      {!error && telemetry.length === 0 && (
        <div className="alert-empty">
          <div className="empty-icon">✓</div>
          <h3>No Telemetry Records</h3>
          <p>No edge telemetry metrics are currently available.</p>
          <button className="primary-action" onClick={loadTelemetry}>
            Refresh
          </button>
        </div>
      )}

      {!error && telemetry.length > 0 && (
        <>
          <div className="alert-summary-grid">
            <div className="alert-summary-card">
              <span>Latest CPU Usage</span>
              <strong>{formatMetric(latest.cpuUsage, "%")}</strong>
            </div>

            <div className="alert-summary-card">
              <span>Latest Memory Usage</span>
              <strong>{formatMetric(latest.memoryUsage, "%")}</strong>
            </div>

            <div className="alert-summary-card medium">
              <span>Latest Temperature</span>
              <strong>{formatMetric(latest.temperature, "°C")}</strong>
            </div>

            <div className="alert-summary-card low">
              <span>Total Records</span>
              <strong>{telemetry.length}</strong>
            </div>
          </div>

          <div className="data-panel">
            <table className="professional-table">
              <thead>
                <tr>
                  <th>Device ID</th>
                  <th>CPU</th>
                  <th>Memory</th>
                  <th>Temperature</th>
                  <th>Status</th>
                  <th>Recorded At</th>
                </tr>
              </thead>

              <tbody>
                {telemetry.slice(0, 12).map(record => (
                  <tr key={record.id}>
                    <td className="mono-value">{record.deviceId}</td>
                    <td>{formatMetric(record.cpuUsage, "%")}</td>
                    <td>{formatMetric(record.memoryUsage, "%")}</td>
                    <td>{formatMetric(record.temperature, "°C")}</td>
                    <td>
                      <span className={statusClass(record.heartbeatStatus)}>
                        {record.heartbeatStatus}
                      </span>
                    </td>
                    <td>{formatDate(record.recordedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
