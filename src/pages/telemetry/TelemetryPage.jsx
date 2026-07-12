import { useEffect, useMemo, useState } from "react";

import HistoricalLineChart from "../../components/charts/HistoricalLineChart";
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

function normaliseTelemetry(records) {
  return [...records]
    .sort(
      (first, second) =>
        new Date(first.recordedAt) - new Date(second.recordedAt)
    )
    .map(record => ({
      ...record,
      cpuUsage: Number(record.cpuUsage),
      memoryUsage: Number(record.memoryUsage),
      temperature: Number(record.temperature)
    }));
}

function normaliseServiceMetrics(records) {
  return [...records]
    .sort(
      (first, second) =>
        new Date(first.recordedAt) - new Date(second.recordedAt)
    )
    .map(record => ({
      ...record,
      responseTimeMs: Number(record.responseTimeMs)
    }));
}

export default function TelemetryPage() {
  const [telemetry, setTelemetry] = useState([]);
  const [serviceMetrics, setServiceMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadTelemetry() {
    try {
      setLoading(true);
      setError("");

      const data = await getTelemetryHistory();

      setTelemetry(
        Array.isArray(data.telemetryMetrics)
          ? data.telemetryMetrics
          : []
      );

      setServiceMetrics(
        Array.isArray(data.serviceMetrics)
          ? data.serviceMetrics
          : []
      );
    } catch {
      setError(
        "Unable to load historical monitoring data. Please verify the Monitoring Service is running."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTelemetry();
  }, []);

  const telemetryChartData = useMemo(
    () => normaliseTelemetry(telemetry).slice(-30),
    [telemetry]
  );

  const serviceChartData = useMemo(
    () => normaliseServiceMetrics(serviceMetrics).slice(-30),
    [serviceMetrics]
  );

  const latest = telemetryChartData.at(-1);

  if (loading) {
    return (
      <section className="telemetry-page">
        <div className="page-hero">
          <div>
            <p className="eyebrow">Monitoring Service</p>
            <h2>Historical Observability</h2>
            <p>Loading telemetry and service performance history...</p>
          </div>
        </div>

        <div className="telemetry-loading-grid">
          <div className="alert-skeleton"></div>
          <div className="alert-skeleton"></div>
          <div className="alert-skeleton"></div>
          <div className="alert-skeleton"></div>
        </div>
      </section>
    );
  }

  return (
    <section className="telemetry-page">
      <div className="page-hero">
        <div>
          <p className="eyebrow">Observability Analytics</p>
          <h2>Historical Metrics</h2>
          <p>
            Analyse CPU, memory, temperature and service response trends
            across the EdgeCloud Monitor platform.
          </p>
        </div>

        <button className="primary-action" onClick={loadTelemetry}>
          Refresh Metrics
        </button>
      </div>

      {error && (
        <div className="alert-error">
          <strong>Unable to load observability data</strong>
          <p>{error}</p>
          <button onClick={loadTelemetry}>Retry</button>
        </div>
      )}

      {!error && telemetry.length === 0 && serviceMetrics.length === 0 && (
        <div className="alert-empty">
          <div className="empty-icon">✓</div>
          <h3>No Historical Metrics</h3>
          <p>
            Historical monitoring and telemetry data are not currently
            available.
          </p>
          <button className="primary-action" onClick={loadTelemetry}>
            Refresh
          </button>
        </div>
      )}

      {!error && (telemetry.length > 0 || serviceMetrics.length > 0) && (
        <>
          <div className="alert-summary-grid">
            <div className="alert-summary-card">
              <span>Latest CPU Usage</span>
              <strong>{formatMetric(latest?.cpuUsage, "%")}</strong>
            </div>

            <div className="alert-summary-card">
              <span>Latest Memory Usage</span>
              <strong>{formatMetric(latest?.memoryUsage, "%")}</strong>
            </div>

            <div className="alert-summary-card medium">
              <span>Latest Temperature</span>
              <strong>{formatMetric(latest?.temperature, "°C")}</strong>
            </div>

            <div className="alert-summary-card low">
              <span>Historical Records</span>
              <strong>{telemetry.length + serviceMetrics.length}</strong>
            </div>
          </div>

          <div className="monitoring-chart-grid">
            <HistoricalLineChart
              title="CPU Usage Trend"
              description="Edge device processor utilisation over time."
              valueLabel="Compute"
              data={telemetryChartData}
              dataKey="cpuUsage"
              unit="%"
              lineColour="#2563eb"
              domain={[0, 100]}
            />

            <HistoricalLineChart
              title="Memory Usage Trend"
              description="Historical memory utilisation from edge telemetry."
              valueLabel="Memory"
              data={telemetryChartData}
              dataKey="memoryUsage"
              unit="%"
              lineColour="#16a34a"
              domain={[0, 100]}
            />

            <HistoricalLineChart
              title="Temperature Trend"
              description="Thermal behaviour reported by monitored edge devices."
              valueLabel="Thermal"
              data={telemetryChartData}
              dataKey="temperature"
              unit="°C"
              lineColour="#ea580c"
            />

            <HistoricalLineChart
              title="Service Response Time"
              description="Recorded backend service latency across health checks."
              valueLabel="Service Performance"
              data={serviceChartData}
              dataKey="responseTimeMs"
              unit=" ms"
              lineColour="#7c3aed"
            />
          </div>

          {telemetry.length > 0 && (
            <section className="telemetry-history-section">
              <div className="telemetry-section-header">
                <div>
                  <p className="monitoring-chart-label">
                    Historical Records
                  </p>
                  <h3>Recent Telemetry</h3>
                  <span>
                    Latest CPU, memory, temperature and heartbeat samples.
                  </span>
                </div>

                <strong>{telemetry.length} records</strong>
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
                    {[...telemetry]
                      .sort(
                        (first, second) =>
                          new Date(second.recordedAt) -
                          new Date(first.recordedAt)
                      )
                      .slice(0, 12)
                      .map(record => (
                        <tr key={record.id}>
                          <td className="mono-value">
                            {record.deviceId}
                          </td>

                          <td>{formatMetric(record.cpuUsage, "%")}</td>

                          <td>
                            {formatMetric(record.memoryUsage, "%")}
                          </td>

                          <td>
                            {formatMetric(record.temperature, "°C")}
                          </td>

                          <td>
                            <span
                              className={statusClass(
                                record.heartbeatStatus
                              )}
                            >
                              {record.heartbeatStatus}
                            </span>
                          </td>

                          <td>{formatDate(record.recordedAt)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </section>
  );
}
