function StatusBadge({ children, variant = "", ...props }) {
  return (
    <span
      className={`ui-status-badge ${variant.toLowerCase()}`}
      {...props}
    >
      {children}
    </span>
  );
}

export default StatusBadge;
