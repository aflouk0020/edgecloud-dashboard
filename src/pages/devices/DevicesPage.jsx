import React, { useCallback, useMemo, useState } from "react";

import MonitoringFilterBar, {
  FilterSelect
} from "../../components/filters/MonitoringFilterBar";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import LoadingState from "../../components/ui/LoadingState";
import PageHero from "../../components/ui/PageHero";
import StatCard from "../../components/ui/StatCard";
import StatusBadge from "../../components/ui/StatusBadge";
import { PrimaryButton } from "../../components/ui/Buttons";
import { getDeviceAggregation } from "../../services/metricAggregationService";
import { getDevices } from "../../services/deviceService";

function formatDate(value) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
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

export default function DevicesPage() {
  const [devices, setDevices] = useState([]);
  const [aggregationByDevice, setAggregationByDevice] = useState({});
  const [aggregationStateByDevice, setAggregationStateByDevice] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  async function loadDevices() {
    try {
      setLoading(true);
      setError("");
      setAggregationByDevice({});
      setAggregationStateByDevice({});

      const data = await getDevices();
      setDevices(Array.isArray(data) ? data : []);
    } catch {
      setError("Unable to load devices. Please verify the Device Service is running.");
    } finally {
      setLoading(false);
    }
  }

  const loadAggregation = useCallback(async deviceId => {
    setAggregationByDevice(previous => {
      const next = { ...previous };
      delete next[deviceId];
      return next;
    });

    setAggregationStateByDevice(previous => ({
      ...previous,
      [deviceId]: aggregationState(true, false)
    }));

    try {
      const aggregation = await getDeviceAggregation(deviceId);

      setAggregationByDevice(previous => ({
        ...previous,
        [deviceId]: aggregation
      }));

      setAggregationStateByDevice(previous => ({
        ...previous,
        [deviceId]: aggregationState(false, false)
      }));
    } catch {
      setAggregationStateByDevice(previous => ({
        ...previous,
        [deviceId]: aggregationState(false, true)
      }));
    }
  }, []);

  React.useEffect(() => {
    let active = true;

    getDevices()
      .then(data => {
        if (active) {
          setDevices(Array.isArray(data) ? data : []);
          setError("");
        }
      })
      .catch(() => {
        if (active) {
          setError(
            "Unable to load devices. Please verify the Device Service is running."
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

  const onlineCount =
    devices.filter(device => device.status === "ONLINE").length;

  const offlineCount =
    devices.filter(device => device.status === "OFFLINE").length;

  const deviceTypeOptions = useMemo(() => {
    const deviceTypes = [...new Set(
      devices
        .map(device => device.deviceType)
        .filter(Boolean)
    )].sort();

    return [
      { value: "ALL", label: "All device types" },
      ...deviceTypes.map(deviceType => ({
        value: deviceType,
        label: deviceType
      }))
    ];
  }, [devices]);

  const filteredDevices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return devices.filter(device => {
      const matchesSearch =
        !query ||
        device.deviceName?.toLowerCase().includes(query) ||
        device.ipAddress?.toLowerCase().includes(query) ||
        device.id?.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "ALL" || device.status === statusFilter;

      const matchesType =
        typeFilter === "ALL" || device.deviceType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [devices, searchQuery, statusFilter, typeFilter]);

  const spotlightDevice = filteredDevices[0] || null;
  const spotlightAggregation = spotlightDevice
    ? aggregationByDevice[spotlightDevice.id]
    : null;
  const spotlightAggregationState = spotlightDevice
    ? aggregationStateByDevice[spotlightDevice.id] || aggregationState(true, false)
    : aggregationState(true, false);

  React.useEffect(() => {
    if (spotlightDevice) {
      loadAggregation(spotlightDevice.id);
    }
  }, [loadAggregation, spotlightDevice?.id]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    statusFilter !== "ALL" ||
    typeFilter !== "ALL";

  function clearFilters() {
    setSearchQuery("");
    setStatusFilter("ALL");
    setTypeFilter("ALL");
  }

  if (loading) {
    return (
      <section className="devices-page">
        <LoadingState message="Loading registered edge devices..." />
      </section>
    );
  }

  return (
    <section className="devices-page">
      <PageHero
        eyebrow="Device Service"
        title="Edge Device Monitoring"
        description="Track Raspberry Pi and simulated edge node availability, metadata, and heartbeat state."
        action={
          <PrimaryButton onClick={loadDevices}>
            Refresh Devices
          </PrimaryButton>
        }
      />

      <div className="alert-summary-grid">
        <StatCard
          title="Registered Devices"
          value={devices.length}
        />

        <StatCard
          title="Online Devices"
          value={onlineCount}
          variant="success"
        />

        <StatCard
          title="Offline Devices"
          value={offlineCount}
          variant="danger"
        />
      </div>

      {!error && spotlightDevice && (
        <section className="service-reliability-panel info">
          <div className="service-reliability-header">
            <div>
              <span className="service-reliability-eyebrow">
                Aggregation spotlight
              </span>
              <strong>{spotlightDevice.deviceName}</strong>
            </div>
            <span className="service-reliability-date">
              Latest sample: {
                firstSummary(spotlightAggregation)?.availability?.latestRecordedAt
                  ? formatDate(firstSummary(spotlightAggregation).availability.latestRecordedAt)
                  : "Unavailable"
              }
            </span>
          </div>

          {spotlightAggregationState.loading ? (
            <LoadingState message="Loading device aggregation..." />
          ) : spotlightAggregationState.error ? (
            <ErrorState
              title="Device aggregation unavailable"
              message="The aggregation endpoint could not be loaded right now."
            />
          ) : spotlightAggregation?.emptyResult ? (
            <EmptyState
              title="No aggregation samples yet"
              message="This device has no aggregation data in the selected scope."
            />
          ) : (
            <div className="service-reliability-grid">
              <div>
                <span>Average CPU usage</span>
                <strong>
                  {metricValue(firstSummary(spotlightAggregation), "averageValue") ?? "—"}
                  <small>%</small>
                </strong>
              </div>
              <div>
                <span>Minimum CPU usage</span>
                <strong>
                  {metricValue(firstSummary(spotlightAggregation), "minimumValue") ?? "—"}
                  <small>%</small>
                </strong>
              </div>
              <div>
                <span>Maximum CPU usage</span>
                <strong>
                  {metricValue(firstSummary(spotlightAggregation), "maximumValue") ?? "—"}
                  <small>%</small>
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
                <span>Latest heartbeat</span>
                <strong>
                  {availabilityValue(firstSummary(spotlightAggregation), "latestRecordedAt")
                    ? formatDate(availabilityValue(firstSummary(spotlightAggregation), "latestRecordedAt"))
                    : "—"}
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
            <PrimaryButton onClick={loadDevices}>
              Retry
            </PrimaryButton>
          }
        />
      )}

      {!error && devices.length === 0 && (
        <EmptyState
          title="No Registered Devices"
          message="No edge devices are currently registered."
          action={
            <PrimaryButton onClick={loadDevices}>
              Refresh
            </PrimaryButton>
          }
        />
      )}

      {!error && devices.length > 0 && (
        <>
          <MonitoringFilterBar
            searchId="device-search"
            searchLabel="Device name, IP, or ID"
            searchPlaceholder="Search raspberry-pi-01..."
            searchValue={searchQuery}
            onSearchChange={event => setSearchQuery(event.target.value)}
            resultCount={filteredDevices.length}
            totalCount={devices.length}
            hasActiveFilters={hasActiveFilters}
            onClear={clearFilters}
          >
            <FilterSelect
              id="device-status-filter"
              label="Device status"
              value={statusFilter}
              onChange={event => setStatusFilter(event.target.value)}
              options={[
                { value: "ALL", label: "All statuses" },
                { value: "ONLINE", label: "Online" },
                { value: "OFFLINE", label: "Offline" }
              ]}
            />

            <FilterSelect
              id="device-type-filter"
              label="Device type"
              value={typeFilter}
              onChange={event => setTypeFilter(event.target.value)}
              options={deviceTypeOptions}
            />
          </MonitoringFilterBar>

          {filteredDevices.length === 0 ? (
            <EmptyState
              title="No Matching Devices"
              message="No registered devices match the current search, status, and device-type filters."
              action={
                <PrimaryButton onClick={clearFilters}>
                  Clear Filters
                </PrimaryButton>
              }
            />
          ) : (
            <div className="incident-list">
              {filteredDevices.map(device => (
                <article className="incident-card" key={device.id}>
                  <div className="incident-card-header">
                    <StatusBadge variant={device.status}>
                      {device.status}
                    </StatusBadge>

                    <span className="incident-type">
                      {device.deviceName}
                    </span>
                  </div>

                  <p className="incident-message">
                    {device.deviceType} edge node registered at {device.ipAddress}
                  </p>

                  <div className="incident-meta-grid">
                    <div>
                      <span>IP Address</span>
                      <strong>{device.ipAddress}</strong>
                    </div>

                    <div>
                      <span>Registered</span>
                      <strong>{formatDate(device.registeredAt)}</strong>
                    </div>

                    <div>
                      <span>Last Heartbeat</span>
                      <strong>{formatDate(device.lastHeartbeat)}</strong>
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
