function ErrorState({ title = "Unable to complete request", message, action }) {
  return (
    <div className="ui-state-panel ui-error-state">
      <strong>{title}</strong>
      <p>{message}</p>
      {action}
    </div>
  );
}

export default ErrorState;
