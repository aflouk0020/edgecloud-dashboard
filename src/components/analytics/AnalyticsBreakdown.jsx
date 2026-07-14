export default function AnalyticsBreakdown({
  eyebrow,
  title,
  description,
  total,
  items
}) {
  const safeTotal = Number(total) || 0;

  return (
    <article className="analytics-breakdown-card">
      <div className="analytics-breakdown-header">
        <div>
          <p>{eyebrow}</p>
          <h3>{title}</h3>
        </div>
        <strong>{safeTotal}</strong>
      </div>

      <span className="analytics-breakdown-description">
        {description}
      </span>

      <div className="analytics-breakdown-list">
        {items.map(item => {
          const itemValue = Number(item.value) || 0;
          const percentage = safeTotal > 0
            ? Math.min((itemValue / safeTotal) * 100, 100)
            : 0;

          return (
            <div className="analytics-breakdown-row" key={item.label}>
              <div>
                <span className={`analytics-legend-dot ${item.tone}`}></span>
                <span>{item.label}</span>
                <strong>{itemValue}</strong>
              </div>

              <div className="analytics-breakdown-track">
                <span
                  className={item.tone}
                  style={{ width: `${percentage}%` }}
                ></span>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
