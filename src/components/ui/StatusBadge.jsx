function StatusBadge({ children, variant = "" }) {
  return (
    <span className={`ui-status-badge ${variant.toLowerCase()}`}>
      {children}
    </span>
  );
}

export default StatusBadge;
