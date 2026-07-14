function formatMetric(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "0";
  }

  return new Intl.NumberFormat("en-IE", {
    maximumFractionDigits: 2
  }).format(numericValue);
}

export default function AnalyticsKpiCard({
  label,
  value,
  unit = "",
  description,
  eyebrow,
  tone = "info",
  progress
}) {
  const safeProgress = Math.max(0, Math.min(Number(progress) || 0, 100));

  return (
    <article className={`analytics-kpi-card ${tone}`}>
      <div className="analytics-kpi-topline">
        <span className="analytics-kpi-eyebrow">{eyebrow}</span>
        <span className="analytics-live-badge">
          <span aria-hidden="true"></span>
          Live rollup
        </span>
      </div>

      <p>{label}</p>

      <strong>
        {formatMetric(value)}
        {unit && <small>{unit}</small>}
      </strong>

      {progress !== undefined && (
        <div
          className="analytics-kpi-progress"
          role="progressbar"
          aria-label={label}
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={safeProgress}
        >
          <span style={{ width: `${safeProgress}%` }}></span>
        </div>
      )}

      <span className="analytics-kpi-description">{description}</span>
    </article>
  );
}
