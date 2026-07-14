# SCRUM-96 — Monitoring Metrics Filtering and Search

## Summary

SCRUM-96 adds consistent client-side search and filtering across the EdgeCloud
Monitor service, device, telemetry, and alert views. The implementation uses the
existing authenticated API Gateway endpoints and a reusable React filter bar so
the interaction and visual design remain consistent throughout the dashboard.

Backend query parameters were not required for the current platform data volume.
The existing APIs already expose all fields required by the acceptance criteria,
and client-side filtering provides immediate feedback without additional network
requests. Server-side pagination and filtering remain appropriate future work if
the stored datasets grow substantially.

## Implemented Behaviour

- Services can be searched by name or URL and filtered by `UP`, `DOWN`, or
  `UNKNOWN` status.
- Devices can be searched by name, IP address, or ID and filtered by status and
  dynamically discovered device type.
- Telemetry can be searched by device ID, filtered by heartbeat status, and
  limited to the latest 12, 30, or 50 records. Summary values, charts, and the
  historical table update from the same filtered dataset.
- Alerts can be searched by message, source service, or alert type and filtered
  by severity and dynamically discovered alert type.
- Every view displays a visible result count, supports clearing all filters, and
  distinguishes an empty API response from a valid filter with no matches.
- A dedicated authenticated `/services` route and sidebar navigation entry were
  added for monitored service health.

## Validation

Validation completed on 14 July 2026:

- `npm run lint` — passed.
- `npm run test:run` — 14 tests passed across four test files.
- `npm run build` — production build passed.
- API Gateway endpoints for services, devices, history, and alerts returned HTTP
  200 with a valid JWT.
- Manual browser validation completed for search, dropdown filters, result
  counts, clear-filter actions, filtered empty states, and retained alert
  root-cause suggestions.

## Acceptance Criteria

| Acceptance criterion | Evidence | Status |
| --- | --- | --- |
| AC1 — Service filtering | Service name/URL search and health-status filter | Passed |
| AC2 — Device filtering | Status and device-type filters plus device search | Passed |
| AC3 — Alert filtering | Severity, alert-type, and text filters | Passed |
| AC4 — Telemetry filtering | Device ID, heartbeat status, and record limit | Passed |
| AC5 — Frontend controls | Reusable responsive filter bar on all four views | Passed |
| AC6 — Empty/error states | API errors, source-empty states, and filtered-empty states | Passed |

## Screenshot Evidence

- `01-services-filter.jpg` — service search reduced two records to one.
- `02-devices-filter.jpg` — `OFFLINE` status filter reduced two devices to one.
- `03-telemetry-filter.jpg` — device ID search updated metrics, charts, and table.
- `04-alerts-filter.jpg` — alert-type filtering retained the matching root-cause
  suggestion panel.
