function StatCard({ title, value, variant = "" }) {
  return (
    <div className={`ui-stat-card ${variant}`}>
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default StatCard;
