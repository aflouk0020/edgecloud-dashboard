export function PrimaryButton({ children, ...props }) {
  return (
    <button className="ui-primary-button" {...props}>
      {children}
    </button>
  );
}

export function SecondaryButton({ children, ...props }) {
  return (
    <button className="ui-secondary-button" {...props}>
      {children}
    </button>
  );
}
