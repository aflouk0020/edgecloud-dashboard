import React, { useMemo, useState } from "react";

import MonitoringFilterBar, {
  FilterSelect
} from "../../components/filters/MonitoringFilterBar";
import { PrimaryButton } from "../../components/ui/Buttons";
import EmptyState from "../../components/ui/EmptyState";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

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

  React.useEffect(() => {
    let active = true;

    getActiveAlerts()
      .then(data => {
        if (active) {
          setAlerts(Array.isArray(data) ? data : []);
          setError("");
        }
      })
      .catch(() => {
        if (active) {
          setError(
            "Unable to load active alerts. Please verify that the Alert Service and API Gateway are running."
          );
        }
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

  const summary = useMemo(() => {
    return {
      total: alerts.length,
      high: alerts.filter(alert => alert.severity === "HIGH").length,
      medium: alerts.filter(alert => alert.severity === "MEDIUM").length,
      low: alerts.filter(alert => alert.severity === "LOW").length
    };
  }, [alerts]);

  const alertTypeOptions = useMemo(() => {
    const alertTypes = [...new Set(
      alerts
        .map(alert => alert.alertType)
        .filter(Boolean)
    )].sort();

    return [
      { value: "ALL", label: "All alert types" },
      ...alertTypes.map(alertType => ({
        value: alertType,
        label: alertType.replaceAll("_", " ")
      }))
    ];
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return alerts.filter(alert => {
      const matchesSearch =
        !query ||
        alert.message?.toLowerCase().includes(query) ||
        alert.sourceService?.toLowerCase().includes(query) ||
        alert.alertType?.toLowerCase().includes(query);

      const matchesSeverity =
        severityFilter === "ALL" || alert.severity === severityFilter;

      const matchesType =
        typeFilter === "ALL" || alert.alertType === typeFilter;

      return matchesSearch && matchesSeverity && matchesType;
    });
  }, [alerts, searchQuery, severityFilter, typeFilter]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    severityFilter !== "ALL" ||
    typeFilter !== "ALL";

  function clearFilters() {
    setSearchQuery("");
    setSeverityFilter("ALL");
    setTypeFilter("ALL");
  }

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

      {!error && alerts.length > 0 && (
        <>
          <MonitoringFilterBar
            searchId="alert-search"
            searchLabel="Message, source, or type"
            searchPlaceholder="Search service down..."
            searchValue={searchQuery}
            onSearchChange={event => setSearchQuery(event.target.value)}
            resultCount={filteredAlerts.length}
            totalCount={alerts.length}
            hasActiveFilters={hasActiveFilters}
            onClear={clearFilters}
          >
            <FilterSelect
              id="alert-severity-filter"
              label="Severity"
              value={severityFilter}
              onChange={event => setSeverityFilter(event.target.value)}
              options={[
                { value: "ALL", label: "All severities" },
                { value: "HIGH", label: "High" },
                { value: "MEDIUM", label: "Medium" },
                { value: "LOW", label: "Low" }
              ]}
            />

            <FilterSelect
              id="alert-type-filter"
              label="Alert type"
              value={typeFilter}
              onChange={event => setTypeFilter(event.target.value)}
              options={alertTypeOptions}
            />
          </MonitoringFilterBar>

          {filteredAlerts.length === 0 ? (
            <EmptyState
              title="No Matching Alerts"
              message="No active alerts match the current search, severity, and alert-type filters."
              action={
                <PrimaryButton onClick={clearFilters}>
                  Clear Filters
                </PrimaryButton>
              }
            />
          ) : (
            <div className="incident-list">
              {filteredAlerts.map(alert => (
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

              {alert.rootCauseSuggestion && (
                <div className="root-cause-panel">
                  <div className="root-cause-header">
                    <span className="root-cause-icon">💡</span>

                    <div>
                      <strong>Possible Root Cause</strong>
                      <p>{alert.rootCauseSuggestion}</p>
                    </div>
                  </div>
                </div>
              )}

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
        </>
      )}
    </section>
  );
}

export default AlertsPage;
