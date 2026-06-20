import { useEffect, useState } from "react";
import { getTelemetryHistory } from "../../services/telemetryService";

export default function TelemetryPage() {
  const [telemetry, setTelemetry] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadTelemetry() {
    try {
      setError("");
      const data = await getTelemetryHistory();
      setTelemetry(data.telemetryMetrics || []);
    } catch {
      setError("Unable to load telemetry metrics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTelemetry();
  }, []);

  if (loading) return <h2>Loading telemetry metrics...</h2>;
  if (error) return <h2>{error}</h2>;
  if (telemetry.length === 0) return <h2>No telemetry records found</h2>;

  const latest = telemetry[0];

  return (
    <>
      <h1>Telemetry Metrics</h1>

      <button onClick={loadTelemetry}>Refresh</button>

      <div className="dashboard-grid">
        <div className="summary-card">
          <h3>Latest CPU Usage</h3>
          <h2>{latest.cpuUsage}%</h2>
        </div>

        <div className="summary-card">
          <h3>Latest Memory Usage</h3>
          <h2>{latest.memoryUsage}%</h2>
        </div>

        <div className="summary-card">
          <h3>Latest Temperature</h3>
          <h2>{latest.temperature}°C</h2>
        </div>

        <div className="summary-card">
          <h3>Total Telemetry Records</h3>
          <h2>{telemetry.length}</h2>
        </div>
      </div>

      <h2>Recent Telemetry History</h2>

      <div className="telemetry-table-wrapper">
        <table className="telemetry-table">
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
            {telemetry.map(record => (
              <tr key={record.id}>
                <td>{record.deviceId}</td>
                <td>{record.cpuUsage}%</td>
                <td>{record.memoryUsage}%</td>
                <td>{record.temperature}°C</td>
                <td>{record.heartbeatStatus}</td>
                <td>{record.recordedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
