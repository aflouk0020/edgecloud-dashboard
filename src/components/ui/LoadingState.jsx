function LoadingState({ message = "Loading data..." }) {
  return (
    <div className="ui-state-panel">
      <div className="ui-skeleton"></div>
      <p>{message}</p>
    </div>
  );
}

export default LoadingState;
