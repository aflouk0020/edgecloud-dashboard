import StatusBadge from "../ui/StatusBadge";

const STATUS_LABELS = {
  CONNECTED: "Connected",
  REFRESHING: "Refreshing",
  DEGRADED: "Degraded",
  DISCONNECTED: "Disconnected"
};

const STATUS_VARIANTS = {
  CONNECTED: "online",
  REFRESHING: "warning",
  DEGRADED: "warning",
  DISCONNECTED: "offline"
};

function formatTimestamp(value) {
  if (!value) {
    return "Unavailable";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unavailable" : date.toLocaleString("en-IE");
}

export default function ObservabilityConnectionStatus({
  status = "DISCONNECTED",
  lastSuccessfulRefreshAt = null,
  warning = "",
  className = ""
}) {
  const normalizedStatus = STATUS_LABELS[status] ? status : "DISCONNECTED";
  const label = STATUS_LABELS[normalizedStatus];
  const variant = STATUS_VARIANTS[normalizedStatus];

  return (
    <section
      className={`observability-connection-status ${className}`.trim()}
      aria-label="Observability connection status"
    >
      <div className="observability-connection-status__header">
        <StatusBadge
          variant={variant}
          aria-label={`Observability connection status ${label}`}
        >
          {label}
        </StatusBadge>
      </div>

      <p className="observability-connection-status__timestamp">
        <span>Last successful refresh</span>
        <strong>{formatTimestamp(lastSuccessfulRefreshAt)}</strong>
      </p>

      {warning ? (
        <p className="observability-connection-status__warning" role="status">
          {warning}
        </p>
      ) : null}
    </section>
  );
}

