import React, { useMemo, useState } from "react";

import MonitoringFilterBar, {
  FilterSelect
} from "../../components/filters/MonitoringFilterBar";
import { PrimaryButton } from "../../components/ui/Buttons";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import LoadingState from "../../components/ui/LoadingState";
import PageHero from "../../components/ui/PageHero";
import StatCard from "../../components/ui/StatCard";
import StatusBadge from "../../components/ui/StatusBadge";
import { getMonitoredServices } from "../../services/serviceMonitoringService";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "UP", label: "Up" },
  { value: "DOWN", label: "Down" },
  { value: "UNKNOWN", label: "Unknown" }
];

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

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  async function loadServices() {
    try {
      setLoading(true);
      setError("");

      const data = await getMonitoredServices();
      setServices(Array.isArray(data) ? data : []);
    } catch {
      setError(
        "Unable to load monitored services. Please verify the Monitoring Service and API Gateway are running."
      );
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    let active = true;

    getMonitoredServices()
      .then(data => {
        if (active) {
          setServices(Array.isArray(data) ? data : []);
          setError("");
        }
      })
      .catch(() => {
        if (active) {
          setError(
            "Unable to load monitored services. Please verify the Monitoring Service and API Gateway are running."
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

  const filteredServices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return services.filter(service => {
      const matchesSearch =
        !query ||
        service.serviceName?.toLowerCase().includes(query) ||
        service.serviceUrl?.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "ALL" || service.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, services, statusFilter]);

  const upCount = services.filter(service => service.status === "UP").length;
  const downCount = services.filter(service => service.status === "DOWN").length;
  const hasActiveFilters = searchQuery.trim() !== "" || statusFilter !== "ALL";

  function clearFilters() {
    setSearchQuery("");
    setStatusFilter("ALL");
  }

  if (loading) {
    return (
      <section className="services-page">
        <LoadingState message="Loading monitored platform services..." />
      </section>
    );
  }

  return (
    <section className="services-page">
      <PageHero
        eyebrow="Monitoring Service"
        title="Service Health Monitoring"
        description="Search registered services and inspect their latest health-check status and endpoint configuration."
        action={
          <PrimaryButton onClick={loadServices}>
            Refresh Services
          </PrimaryButton>
        }
      />

      <div className="alert-summary-grid">
        <StatCard title="Monitored Services" value={services.length} />
        <StatCard title="Services Up" value={upCount} variant="success" />
        <StatCard title="Services Down" value={downCount} variant="danger" />
      </div>

      {error && (
        <ErrorState
          message={error}
          action={
            <PrimaryButton onClick={loadServices}>
              Retry
            </PrimaryButton>
          }
        />
      )}

      {!error && services.length === 0 && (
        <EmptyState
          title="No Monitored Services"
          message="No services are currently registered with the Monitoring Service."
          action={
            <PrimaryButton onClick={loadServices}>
              Refresh
            </PrimaryButton>
          }
        />
      )}

      {!error && services.length > 0 && (
        <>
          <MonitoringFilterBar
            searchId="service-search"
            searchLabel="Service name or URL"
            searchPlaceholder="Search monitoring-service..."
            searchValue={searchQuery}
            onSearchChange={event => setSearchQuery(event.target.value)}
            resultCount={filteredServices.length}
            totalCount={services.length}
            hasActiveFilters={hasActiveFilters}
            onClear={clearFilters}
          >
            <FilterSelect
              id="service-status-filter"
              label="Health status"
              value={statusFilter}
              onChange={event => setStatusFilter(event.target.value)}
              options={STATUS_OPTIONS}
            />
          </MonitoringFilterBar>

          {filteredServices.length === 0 ? (
            <EmptyState
              title="No Matching Services"
              message="No monitored services match the current search and status filters."
              action={
                <PrimaryButton onClick={clearFilters}>
                  Clear Filters
                </PrimaryButton>
              }
            />
          ) : (
            <div className="incident-list">
              {filteredServices.map(service => (
                <article className="incident-card" key={service.id}>
                  <div className="incident-card-header">
                    <StatusBadge variant={service.status || "UNKNOWN"}>
                      {service.status || "UNKNOWN"}
                    </StatusBadge>

                    <span className="incident-type">
                      {service.serviceName}
                    </span>
                  </div>

                  <p className="incident-message">
                    Latest registered health state for this monitored endpoint.
                  </p>

                  <div className="incident-meta-grid">
                    <div>
                      <span>Service URL</span>
                      <a
                        className="service-url"
                        href={service.serviceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {service.serviceUrl}
                      </a>
                    </div>

                    <div>
                      <span>Registered</span>
                      <strong>{formatDate(service.createdAt)}</strong>
                    </div>

                    <div>
                      <span>Service ID</span>
                      <strong>{service.id}</strong>
                    </div>
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
