import StatusBadge from "../ui/StatusBadge";

export default function ObservabilityFilterChips({
  chips = [],
  onClearAll
}) {
  if (!chips.length) {
    return null;
  }

  return (
    <section className="observability-filter-chips" aria-label="Active filters">
      <div className="observability-filter-chips__header">
        <strong>Active filters</strong>
        {chips.length > 1 ? (
          <button type="button" className="observability-filter-chips__clear" onClick={onClearAll}>
            Clear all
          </button>
        ) : null}
      </div>

      <div className="observability-filter-chips__list">
        {chips.map(chip => (
          <article key={chip.id} className="observability-filter-chip">
            <div className="observability-filter-chip__copy">
              <span>{chip.label}</span>
              <strong>{chip.value ?? "Unknown"}</strong>
            </div>

            {chip.status ? (
              <StatusBadge variant={chip.status}>{chip.status}</StatusBadge>
            ) : null}

            <button
              type="button"
              className="observability-filter-chip__remove"
              aria-label={`Remove ${chip.label}`}
              onClick={chip.onRemove}
            >
              ×
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

