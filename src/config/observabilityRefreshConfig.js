const MIN_REFRESH_INTERVAL_MS = 15000;
const MAX_REFRESH_INTERVAL_MS = 300000;
const DEFAULT_SUMMARY_REFRESH_INTERVAL_MS = 60000;
const DEFAULT_HISTORICAL_REFRESH_INTERVAL_MS = 120000;
const DEFAULT_RETRY_BASE_DELAY_MS = 5000;
const DEFAULT_RETRY_MAX_DELAY_MS = 30000;
const DEFAULT_MAX_CONSECUTIVE_FAILURES = 3;

function parseInteger(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeRefreshInterval(value, fallback) {
  return clamp(parseInteger(value, fallback), MIN_REFRESH_INTERVAL_MS, MAX_REFRESH_INTERVAL_MS);
}

function normalizeDelay(value, fallback) {
  return clamp(parseInteger(value, fallback), 1000, 300000);
}

function normalizeFailureCount(value, fallback) {
  return clamp(parseInteger(value, fallback), 1, 10);
}

export function createObservabilityRefreshConfig(env = import.meta.env) {
  const config = {
    minRefreshIntervalMs: MIN_REFRESH_INTERVAL_MS,
    maxRefreshIntervalMs: MAX_REFRESH_INTERVAL_MS,
    summaryRefreshIntervalMs: normalizeRefreshInterval(
      env?.VITE_OBSERVABILITY_SUMMARY_REFRESH_MS,
      DEFAULT_SUMMARY_REFRESH_INTERVAL_MS
    ),
    historicalRefreshIntervalMs: normalizeRefreshInterval(
      env?.VITE_OBSERVABILITY_HISTORICAL_REFRESH_MS,
      DEFAULT_HISTORICAL_REFRESH_INTERVAL_MS
    ),
    retryBaseDelayMs: normalizeDelay(
      env?.VITE_OBSERVABILITY_RETRY_BASE_DELAY_MS,
      DEFAULT_RETRY_BASE_DELAY_MS
    ),
    retryMaxDelayMs: normalizeDelay(
      env?.VITE_OBSERVABILITY_RETRY_MAX_DELAY_MS,
      DEFAULT_RETRY_MAX_DELAY_MS
    ),
    maxConsecutiveFailures: normalizeFailureCount(
      env?.VITE_OBSERVABILITY_MAX_CONSECUTIVE_FAILURES,
      DEFAULT_MAX_CONSECUTIVE_FAILURES
    ),
    pauseWhenHidden: env?.VITE_OBSERVABILITY_PAUSE_WHEN_HIDDEN !== "false"
  };

  return Object.freeze(config);
}

export const observabilityRefreshConfig = createObservabilityRefreshConfig();

