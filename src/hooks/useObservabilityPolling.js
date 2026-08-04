import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { observabilityRefreshConfig } from "../config/observabilityRefreshConfig";

export const CONNECTION_STATE = Object.freeze({
  CONNECTED: "CONNECTED",
  REFRESHING: "REFRESHING",
  DEGRADED: "DEGRADED",
  DISCONNECTED: "DISCONNECTED"
});

function getVisibilityState() {
  if (typeof document === "undefined") {
    return "visible";
  }

  return document.visibilityState || "visible";
}

function computeRetryDelay(baseDelayMs, maxDelayMs, failureCount) {
  return Math.min(baseDelayMs * (2 ** Math.max(0, failureCount - 1)), maxDelayMs);
}

export function useObservabilityPolling(fetcher, options = {}) {
  const {
    enabled = true,
    immediate = true,
    intervalMs = observabilityRefreshConfig.summaryRefreshIntervalMs,
    retryBaseDelayMs = observabilityRefreshConfig.retryBaseDelayMs,
    retryMaxDelayMs = observabilityRefreshConfig.retryMaxDelayMs,
    maxConsecutiveFailures = observabilityRefreshConfig.maxConsecutiveFailures,
    pauseWhenHidden = observabilityRefreshConfig.pauseWhenHidden,
    autoRefreshEnabled = true
  } = options;

  const [connectionState, setConnectionState] = useState(
    enabled && immediate ? CONNECTION_STATE.REFRESHING : CONNECTION_STATE.CONNECTED
  );
  const [lastSuccessfulRefreshAt, setLastSuccessfulRefreshAt] = useState(null);
  const [lastError, setLastError] = useState(null);
  const [failureCount, setFailureCount] = useState(0);

  const mountedRef = useRef(false);
  const visibleRef = useRef(getVisibilityState() !== "hidden");
  const enabledRef = useRef(enabled);
  const pauseWhenHiddenRef = useRef(pauseWhenHidden);
  const autoRefreshEnabledRef = useRef(autoRefreshEnabled);
  const fetcherRef = useRef(fetcher);
  const timerRef = useRef(null);
  const inFlightRef = useRef(null);
  const consecutiveFailuresRef = useRef(0);
  const retryModeRef = useRef(false);
  const refreshFnRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleRefresh = useCallback((delayMs) => {
    clearTimer();

    if (!enabledRef.current || !mountedRef.current) {
      return;
    }

    if (!autoRefreshEnabledRef.current) {
      return;
    }

    if (pauseWhenHiddenRef.current && !visibleRef.current) {
      return;
    }

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void refreshFnRef.current?.({ source: "scheduled", swallowErrors: true });
    }, delayMs);
  }, [clearTimer]);

  const performRefresh = useCallback(async ({ source = "manual", swallowErrors = false } = {}) => {
    if (!enabledRef.current || !mountedRef.current) {
      return null;
    }

    if (!autoRefreshEnabledRef.current && source === "scheduled") {
      return null;
    }

    if (pauseWhenHiddenRef.current && !visibleRef.current && source === "scheduled") {
      return null;
    }

    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    setConnectionState(CONNECTION_STATE.REFRESHING);
    const request = Promise.resolve().then(() => fetcherRef.current());
    inFlightRef.current = request;

    try {
      const result = await request;

      if (!mountedRef.current) {
        return result;
      }

      consecutiveFailuresRef.current = 0;
      retryModeRef.current = false;
      setFailureCount(0);
      setLastError(null);
      setLastSuccessfulRefreshAt(new Date().toISOString());
      setConnectionState(CONNECTION_STATE.CONNECTED);

      if (enabledRef.current) {
        scheduleRefresh(intervalMs);
      }

      return result;
    } catch (error) {
      if (!mountedRef.current) {
        if (!swallowErrors) {
          throw error;
        }

        return null;
      }

      setLastError(error);

      const status = error?.status || 0;
      if (status === 401 || status === 403) {
        consecutiveFailuresRef.current = maxConsecutiveFailures;
        retryModeRef.current = false;
        setFailureCount(maxConsecutiveFailures);
        setConnectionState(CONNECTION_STATE.DISCONNECTED);
        clearTimer();

        if (!swallowErrors) {
          throw error;
        }

        return null;
      }

      consecutiveFailuresRef.current += 1;
      const nextFailureCount = consecutiveFailuresRef.current;
      setFailureCount(nextFailureCount);

      if (nextFailureCount >= maxConsecutiveFailures) {
        retryModeRef.current = false;
        setConnectionState(CONNECTION_STATE.DISCONNECTED);
        clearTimer();
      } else {
        retryModeRef.current = true;
        setConnectionState(CONNECTION_STATE.DEGRADED);
        scheduleRefresh(computeRetryDelay(retryBaseDelayMs, retryMaxDelayMs, nextFailureCount));
      }

      if (!swallowErrors) {
        throw error;
      }

      return null;
    } finally {
      inFlightRef.current = null;
    }
  }, [
    clearTimer,
    intervalMs,
    maxConsecutiveFailures,
    retryBaseDelayMs,
    retryMaxDelayMs,
    scheduleRefresh
  ]);

  useEffect(() => {
    mountedRef.current = true;
    refreshFnRef.current = performRefresh;
    enabledRef.current = enabled;
    pauseWhenHiddenRef.current = pauseWhenHidden;
    autoRefreshEnabledRef.current = autoRefreshEnabled;
    fetcherRef.current = fetcher;

    if (!enabled) {
      setConnectionState(CONNECTION_STATE.DISCONNECTED);
      clearTimer();
      return () => {
        mountedRef.current = false;
        clearTimer();
      };
    }

    if (immediate) {
      void performRefresh({ source: "initial", swallowErrors: true });
    } else {
      setConnectionState(CONNECTION_STATE.CONNECTED);
      if (!pauseWhenHiddenRef.current || visibleRef.current) {
        scheduleRefresh(intervalMs);
      }
    }

    const handleVisibilityChange = () => {
      visibleRef.current = getVisibilityState() !== "hidden";

      if (!visibleRef.current) {
        clearTimer();
        return;
      }

      if (!enabledRef.current) {
        return;
      }

      if (!autoRefreshEnabledRef.current) {
        return;
      }

      if (inFlightRef.current) {
        return;
      }

      void performRefresh({ source: "visibility", swallowErrors: true });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mountedRef.current = false;
      clearTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [autoRefreshEnabled, clearTimer, enabled, immediate, intervalMs, performRefresh, pauseWhenHidden, scheduleRefresh]);

  const refresh = useCallback(() => performRefresh({ source: "manual", swallowErrors: false }), [performRefresh]);

  return useMemo(() => ({
    connectionState,
    lastSuccessfulRefreshAt,
    lastError,
    failureCount,
    refresh
  }), [connectionState, failureCount, lastError, lastSuccessfulRefreshAt, refresh]);
}
