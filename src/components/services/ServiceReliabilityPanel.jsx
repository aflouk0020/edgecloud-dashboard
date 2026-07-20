import { SecondaryButton } from "../ui/Buttons";
import StatusBadge from "../ui/StatusBadge";

function formatMetric(value, maximumFractionDigits = 2) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "0";
  }

  return new Intl.NumberFormat("en-IE", {
    maximumFractionDigits
  }).format(numericValue);
}

function formatDate(value) {
  if (!value) {
    return "No downtime recorded";
  }

  return new Intl.DateTimeFormat("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds) || 0);

  if (seconds < 60) {
    return `${Math.round(seconds)} sec`;
  }

  if (seconds < 3600) {
    return `${formatMetric(seconds / 60, 1)} min`;
  }

  return `${formatMetric(seconds / 3600, 1)} hr`;
}

function reliabilityTone(availability) {
  if (availability.currentlyDown) {
    return "danger";
  }

  if (availability.uptimePercentage >= 99) {
    return "success";
  }

  if (availability.uptimePercentage >= 95) {
    return "warning";
  }

  return "danger";
}

export default function ServiceReliabilityPanel({
  availability,
  loading,
  error,
  onRetry
}) {
  if (loading) {
    return (
      <div className="service-reliability-state" role="status">
        <span className="service-reliability-spinner" aria-hidden="true"></span>
        Calculating reliability history...
      </div>
    );
  }

  if (error) {
    return (
      <div className="service-reliability-state error">
        <div>
          <strong>Reliability data unavailable</strong>
          <span>
            Service health remains visible, but historical uptime could not be loaded.
          </span>
        </div>

        <SecondaryButton onClick={onRetry}>
          Retry Reliability
        </SecondaryButton>
      </div>
    );
  }

  if (!availability || availability.totalChecks === 0) {
    return (
      <div className="service-reliability-state empty">
        <div>
          <strong>No reliability history yet</strong>
          <span>
            Uptime metrics will appear after the first health-check samples are recorded.
          </span>
        </div>
      </div>
    );
  }

  const tone = reliabilityTone(availability);

  return (
    <section className={`service-reliability-panel ${tone}`}>
      <div className="service-reliability-header">
        <div>
          <span className="service-reliability-eyebrow">
            Historical reliability
          </span>
          <strong>
            {formatMetric(availability.uptimePercentage)}
            <small>% uptime</small>
          </strong>
        </div>

        <StatusBadge
          variant={availability.currentlyDown ? "DOWN" : "UP"}
        >
          {availability.currentlyDown ? "ACTIVE DOWNTIME" : "AVAILABLE"}
        </StatusBadge>
      </div>

      <div
        className="service-reliability-progress"
        role="progressbar"
        aria-label={`${availability.serviceName} uptime`}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={availability.uptimePercentage}
      >
        <span
          style={{
            width: `${Math.max(
              0,
              Math.min(Number(availability.uptimePercentage) || 0, 100)
            )}%`
          }}
        ></span>
      </div>

      <div className="service-reliability-grid">
        <div>
          <span>Health checks</span>
          <strong>{availability.totalChecks}</strong>
          <small>
            {availability.upChecks} UP · {availability.downChecks} DOWN
          </small>
        </div>

        <div>
          <span>Average latency</span>
          <strong>
            {formatMetric(availability.averageResponseTimeMs)}
            <small> ms</small>
          </strong>
        </div>

        <div>
          <span>Downtime events</span>
          <strong>{availability.downtimeEventCount}</strong>
          <small>{formatDuration(availability.totalDowntimeSeconds)}</small>
        </div>

        <div>
          <span>Last downtime</span>
          <strong className="service-reliability-date">
            {formatDate(availability.lastDowntimeStartedAt)}
          </strong>
          <small>
            Recovery: {formatDate(availability.lastRecoveredAt)}
          </small>
        </div>
      </div>
    </section>
  );
}
