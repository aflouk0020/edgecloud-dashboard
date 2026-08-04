import { describe, expect, it } from "vitest";

import { createObservabilityRefreshConfig } from "./observabilityRefreshConfig";

describe("createObservabilityRefreshConfig", () => {
  it("uses safe defaults and freezes the resulting config", () => {
    const config = createObservabilityRefreshConfig({});

    expect(Object.isFrozen(config)).toBe(true);
    expect(config.summaryRefreshIntervalMs).toBe(60000);
    expect(config.historicalRefreshIntervalMs).toBe(120000);
    expect(config.retryBaseDelayMs).toBe(5000);
    expect(config.retryMaxDelayMs).toBe(30000);
    expect(config.maxConsecutiveFailures).toBe(3);
    expect(config.pauseWhenHidden).toBe(true);
  });

  it("clamps invalid or out-of-range values to safe bounds", () => {
    const config = createObservabilityRefreshConfig({
      VITE_OBSERVABILITY_SUMMARY_REFRESH_MS: "9000",
      VITE_OBSERVABILITY_HISTORICAL_REFRESH_MS: "600000",
      VITE_OBSERVABILITY_RETRY_BASE_DELAY_MS: "not-a-number",
      VITE_OBSERVABILITY_RETRY_MAX_DELAY_MS: "1000000",
      VITE_OBSERVABILITY_MAX_CONSECUTIVE_FAILURES: "0",
      VITE_OBSERVABILITY_PAUSE_WHEN_HIDDEN: "false"
    });

    expect(config.summaryRefreshIntervalMs).toBe(15000);
    expect(config.historicalRefreshIntervalMs).toBe(300000);
    expect(config.retryBaseDelayMs).toBe(5000);
    expect(config.retryMaxDelayMs).toBe(300000);
    expect(config.maxConsecutiveFailures).toBe(1);
    expect(config.pauseWhenHidden).toBe(false);
  });
});

