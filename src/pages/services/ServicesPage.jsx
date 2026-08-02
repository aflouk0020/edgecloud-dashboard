import React, { useCallback, useMemo, useState } from "react";

import MonitoringFilterBar, {
  FilterSelect
} from "../../components/filters/MonitoringFilterBar";
import ServiceReliabilityPanel from "../../components/services/ServiceReliabilityPanel";
import { PrimaryButton } from "../../components/ui/Buttons";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import LoadingState from "../../components/ui/LoadingState";
import PageHero from "../../components/ui/PageHero";
import StatCard from "../../components/ui/StatCard";
import StatusBadge from "../../components/ui/StatusBadge";
import { getServiceAggregation } from "../../services/metricAggregationService";
import {
  getMonitoredServices,
  getServiceAvailability
} from "../../services/serviceMonitoringService";

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

function reliabilityState(loading = false, error = false) {
  return { loading, error };
}

function aggregationState(loading = false, error = false) {
  return { loading, error };
}

function firstSummary(response) {
  return response?.summaries?.[0] || null;
}

function metricValue(summary, key) {
  return summary?.metrics?.[key];
}

function availabilityValue(summary, key) {
  return summary?.availability?.[key];
}

function summaryTimestamp(summary) {
  return summary?.availability?.latestRecordedAt
    || summary?.series?.[0]?.recordedAt
    || null;
}

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [availabilityByService, setAvailabilityByService] = useState({});
  const [reliabilityByService, setReliabilityByService] = useState({});
  const [aggregationByService, setAggregationByService] = useState({});
  const [aggregationStateByService, setAggregationStateByService] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadReliability = useCallback(async serviceId => {
    setAvailabilityByService(previous => {
      const next = { ...previous };
      delete next[serviceId];
      return next;
    });

    setReliabilityByService(previous => ({
      ...previous,
      [serviceId]: reliabilityState(true, false)
    }));

    try {
      const availability = await getServiceAvailability(serviceId);

      setAvailabilityByService(previous => ({
        ...previous,
        [serviceId]: availability
      }));

      setReliabilityByService(previous => ({
        ...previous,
        [serviceId]: reliabilityState(false, false)
      }));
    } catch {
      setReliabilityByService(previous => ({
        ...previous,
        [serviceId]: reliabilityState(false, true)
      }));
    }
  }, []);

  const loadAggregation = useCallback(async serviceId => {
    setAggregationByService(previous => {
      const next = { ...previous };
      delete next[serviceId];
      return next;
    });

    setAggregationStateByService(previous => ({
      ...previous,
      [serviceId]: aggregationState(true, false)
    }));

    try {
      const aggregation = await getServiceAggregation(serviceId);

      setAggregationByService(previous => ({
        ...previous,
        [serviceId]: aggregation
      }));

      setAggregationStateByService(previous => ({
        ...previous,
        [serviceId]: aggregationState(false, false)
      }));
    } catch {
      setAggregationStateByService(previous => ({
        ...previous,
        [serviceId]: aggregationState(false, true)
      }));
    }
  }, []);

  const applyServices = useCallback(monitoredServices => {
    setServices(monitoredServices);

    const initialReliability = Object.fromEntries(
      monitoredServices.map(service => [
        service.id,
        reliabilityState(true, false)
      ])
    );

    setReliabilityByService(initialReliability);
  }, []);

  const loadServices = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setAvailabilityByService({});
      setReliabilityByService({});
      setAggregationByService({});
      setAggregationStateByService({});

      const data = await getMonitoredServices();
      const monitoredServices = Array.isArray(data) ? data : [];

      applyServices(monitoredServices);
    } catch {
      setServices([]);
      setAvailabilityByService({});
      setReliabilityByService({});
      setAggregationByService({});
      setAggregationStateByService({});
      setError(
        "Unable to load monitored services. Please verify the Monitoring Service and API Gateway are running."
      );
    } finally {
      setLoading(false);
    }
  }, [applyServices]);

  React.useEffect(() => {
    let active = true;

    getMonitoredServices()
      .then(data => {
        if (!active) {
          return;
        }

        const monitoredServices = Array.isArray(data) ? data : [];

        setError("");
        applyServices(monitoredServices);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setServices([]);
        setAvailabilityByService({});
        setReliabilityByService({});
        setAggregationByService({});
        setAggregationStateByService({});
        setError(
          "Unable to load monitored services. Please verify the Monitoring Service and API Gateway are running."
        );
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [applyServices]);

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

  const spotlightService = filteredServices[0] || null;
  const spotlightAggregation = spotlightService
    ? aggregationByService[spotlightService.id]
    : null;
  const spotlightAggregationState = spotlightService
    ? aggregationStateByService[spotlightService.id] || aggregationState(true, false)
    : aggregationState(true, false);

  React.useEffect(() => {
    if (!spotlightService) {
      return;
    }

    loadReliability(spotlightService.id);
    loadAggregation(spotlightService.id);
  }, [loadAggregation, loadReliability, spotlightService?.id]);

  const reliabilitySummaries = Object.values(availabilityByService)
    .filter(summary => Number(summary?.totalChecks) > 0);

  const averageUptime = reliabilitySummaries.length > 0
    ? Math.round(
        (
          reliabilitySummaries.reduce(
            (total, summary) =>
              total + (Number(summary.uptimePercentage) || 0),
            0
          ) / reliabilitySummaries.length
        ) * 100
      ) / 100
    : null;

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
        title="Service Health and Reliability"
        description="Inspect current health, historical uptime, response latency, and downtime activity across registered platform services."
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
        <StatCard
          title="Average Uptime"
          value={averageUptime === null ? "—" : `${averageUptime}%`}
          variant={
            averageUptime === null
              ? ""
              : averageUptime >= 95
                ? "success"
                : "warning"
          }
        />
      </div>

      {!error && spotlightService && (
        <section className="service-reliability-panel info">
          <div className="service-reliability-header">
            <div>
              <span className="service-reliability-eyebrow">
                Aggregation spotlight
              </span>
              <strong>{spotlightService.serviceName}</strong>
            </div>
            <span className="service-reliability-date">
              {summaryTimestamp(firstSummary(spotlightAggregation))
                ? `Latest sample: ${formatDate(summaryTimestamp(firstSummary(spotlightAggregation)))}`
                : "Latest sample unavailable"}
            </span>
          </div>

          {spotlightAggregationState.loading ? (
            <LoadingState message="Loading service aggregation..." />
          ) : spotlightAggregationState.error ? (
            <ErrorState
              title="Service aggregation unavailable"
              message="The aggregation endpoint could not be loaded right now."
            />
          ) : spotlightAggregation?.emptyResult ? (
            <EmptyState
              title="No aggregation samples yet"
              message="This service has no aggregation data in the selected scope."
            />
          ) : (
            <div className="service-reliability-grid">
              <div>
                <span>Average response time</span>
                <strong>
                  {metricValue(firstSummary(spotlightAggregation), "averageValue") ?? "—"}
                  <small> ms</small>
                </strong>
              </div>
              <div>
                <span>Minimum response time</span>
                <strong>
                  {metricValue(firstSummary(spotlightAggregation), "minimumValue") ?? "—"}
                  <small> ms</small>
                </strong>
              </div>
              <div>
                <span>Maximum response time</span>
                <strong>
                  {metricValue(firstSummary(spotlightAggregation), "maximumValue") ?? "—"}
                  <small> ms</small>
                </strong>
              </div>
              <div>
                <span>Sample count</span>
                <strong>
                  {metricValue(firstSummary(spotlightAggregation), "sampleCount") ?? 0}
                </strong>
              </div>
              <div>
                <span>Availability</span>
                <strong>
                  {availabilityValue(firstSummary(spotlightAggregation), "availabilityPercentage") ?? 0}
                  <small>%</small>
                </strong>
              </div>
              <div>
                <span>Latest value</span>
                <strong>
                  {metricValue(firstSummary(spotlightAggregation), "latestValue") ?? "—"}
                  <small> ms</small>
                </strong>
              </div>
            </div>
          )}
        </section>
      )}

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
              {filteredServices.map(service => {
                const reliability =
                  reliabilityByService[service.id] ||
                  reliabilityState(true, false);

                return (
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
                      Current service health and historical operational reliability.
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

                    <ServiceReliabilityPanel
                      availability={availabilityByService[service.id]}
                      loading={reliability.loading}
                      error={reliability.error}
                      onRetry={() => loadReliability(service.id)}
                    />
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}
