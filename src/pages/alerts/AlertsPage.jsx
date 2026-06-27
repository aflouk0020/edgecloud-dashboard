import React from "react";
import { useEffect, useMemo, useState } from "react";

import {
  getActiveAlerts,
  resolveAlert
} from "../../services/alertService";

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

function getSeverityClass(severity) {
  return `severity-badge ${String(severity || "").toLowerCase()}`;
}

function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState("");
  const [error, setError] = useState("");

  async function loadAlerts() {
    try {
      setLoading(true);
      setError("");

      const data = await getActiveAlerts();
      setAlerts(Array.isArray(data) ? data : []);
    } catch {
      setError("Unable to load active alerts. Please verify that the Alert Service and API Gateway are running.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResolve(id) {
    try {
      setResolvingId(id);
      await resolveAlert(id);
      await loadAlerts();
    } catch {
      setError("Unable to resolve alert. Please try again.");
    } finally {
      setResolvingId("");
    }
  }

  useEffect(() => {
    loadAlerts();
  }, []);

  const summary = useMemo(() => {
    return {
      total: alerts.length,
      high: alerts.filter(alert => alert.severity === "HIGH").length,
      medium: alerts.filter(alert => alert.severity === "MEDIUM").length,
      low: alerts.filter(alert => alert.severity === "LOW").length
    };
  }, [alerts]);

  if (loading) {
    return (
      <section className="alerts-page">
        <div className="page-hero">
          <div>
            <p className="eyebrow">Alert Service</p>
            <h2>Active Alerts</h2>
            <p>Loading current platform incidents...</p>
          </div>
        </div>

        <div className="alert-skeleton-grid">
          <div className="alert-skeleton"></div>
          <div className="alert-skeleton"></div>
          <div className="alert-skeleton"></div>
        </div>
      </section>
    );
  }

  return (
    <section className="alerts-page">
      <div className="page-hero">
        <div>
          <p className="eyebrow">Alert Service</p>
          <h2>Active Alerts</h2>
          <p>
            Monitor unresolved service, device, database, and infrastructure incidents.
          </p>
        </div>

        <button className="primary-action" onClick={loadAlerts}>
          Refresh
        </button>
      </div>

      <div className="alert-summary-grid">
        <div className="alert-summary-card">
          <span>Total Active</span>
          <strong>{summary.total}</strong>
        </div>

        <div className="alert-summary-card high">
          <span>High Severity</span>
          <strong>{summary.high}</strong>
        </div>

        <div className="alert-summary-card medium">
          <span>Medium Severity</span>
          <strong>{summary.medium}</strong>
        </div>

        <div className="alert-summary-card low">
          <span>Low Severity</span>
          <strong>{summary.low}</strong>
        </div>
      </div>

      {error && (
        <div className="alert-error">
          <strong>Unable to complete request</strong>
          <p>{error}</p>
          <button onClick={loadAlerts}>Retry</button>
        </div>
      )}

      {!error && alerts.length === 0 && (
        <div className="alert-empty">
          <div className="empty-icon">✓</div>
          <h3>No Active Alerts</h3>
          <p>Everything is currently operating normally.</p>
          <button className="primary-action" onClick={loadAlerts}>
            Refresh
          </button>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="incident-list">
          {alerts.map(alert => (
            <article className="incident-card" key={alert.id}>
              <div className="incident-card-header">
                <span className={getSeverityClass(alert.severity)}>
                  {alert.severity}
                </span>

                <span className="incident-type">
                  {alert.alertType}
                </span>
              </div>

              <p className="incident-message">
                {alert.message}
              </p>

              <div className="incident-meta-grid">
                <div>
                  <span>Source</span>
                  <strong>{alert.sourceService}</strong>
                </div>

                <div>
                  <span>Created</span>
                  <strong>{formatDate(alert.createdAt)}</strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong>{alert.status}</strong>
                </div>
              </div>

              <div className="incident-actions">
                <button
                  className="resolve-button"
                  disabled={resolvingId === alert.id}
                  onClick={() => handleResolve(alert.id)}
                >
                  {resolvingId === alert.id ? "Resolving..." : "Resolve Alert"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default AlertsPage;
