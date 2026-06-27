function EmptyState({ title, message, action }) {
  return (
    <div className="ui-state-panel ui-empty-state">
      <div className="ui-empty-icon">✓</div>
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  );
}

export default EmptyState;
