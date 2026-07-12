import AnimatedNumber from "./AnimatedNumber";

function StatCard({ title, value, variant = "", subtitle }) {
  return (
    <div className={`ui-stat-card ${variant}`}>
      <span>{title}</span>

      <strong>
        <AnimatedNumber value={value} />
      </strong>

      {subtitle && (
        <small>{subtitle}</small>
      )}
    </div>
  );
}

export default StatCard;
