import { useEffect, useState } from "react";

import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import LoadingState from "../../components/ui/LoadingState";
import PageHero from "../../components/ui/PageHero";
import StatCard from "../../components/ui/StatCard";
import StatusBadge from "../../components/ui/StatusBadge";
import { PrimaryButton } from "../../components/ui/Buttons";

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

export default function DevicesPage() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDevices() {
    try {
      setLoading(true);
      setError("");

      const data = await getDevices();
      setDevices(Array.isArray(data) ? data : []);
    } catch {
      setError("Unable to load devices. Please verify the Device Service is running.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDevices();
  }, []);

  const onlineCount =
    devices.filter(device => device.status === "ONLINE").length;

  const offlineCount =
    devices.filter(device => device.status === "OFFLINE").length;

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
        <div className="incident-list">
          {devices.map(device => (
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
    </section>
  );
}
