import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CONNECTION_STATE, useObservabilityPolling } from "./useObservabilityPolling";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function setVisibilityState(state) {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state
  });
}

describe("useObservabilityPolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setVisibilityState("visible");
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("refreshes on the configured interval without duplicating concurrent requests", async () => {
    const request = deferred();
    const fetcher = vi.fn(() => request.promise);

    const { result } = renderHook(() =>
      useObservabilityPolling(fetcher, {
        immediate: false,
        intervalMs: 1000,
        retryBaseDelayMs: 250,
        retryMaxDelayMs: 1000,
        maxConsecutiveFailures: 3,
        pauseWhenHidden: true
      })
    );

    expect(result.current.connectionState).toBe(CONNECTION_STATE.CONNECTED);

    let firstPromise;
    let secondPromise;
    await act(async () => {
      firstPromise = result.current.refresh();
      secondPromise = result.current.refresh();
    });

    expect(fetcher).toHaveBeenCalledTimes(1);

    await act(async () => {
      request.resolve({ ok: true });
      await Promise.all([firstPromise, secondPromise]);
      await Promise.resolve();
    });

    expect(result.current.connectionState).toBe(CONNECTION_STATE.CONNECTED);
    expect(result.current.lastSuccessfulRefreshAt).toBeTruthy();

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("transitions to degraded and then recovers after a retry", async () => {
    const first = deferred();
    const second = deferred();
    const fetcher = vi.fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);

    const { result } = renderHook(() =>
      useObservabilityPolling(fetcher, {
        immediate: false,
        intervalMs: 1000,
        retryBaseDelayMs: 250,
        retryMaxDelayMs: 1000,
        maxConsecutiveFailures: 3
      })
    );

    await act(async () => {
      result.current.refresh().catch(() => {});
    });

    await act(async () => {
      first.reject(Object.assign(new Error("temporary failure"), { status: 500 }));
      await Promise.resolve();
    });

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.connectionState).toBe(CONNECTION_STATE.DEGRADED);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });

    expect(fetcher).toHaveBeenCalledTimes(2);

    await act(async () => {
      second.resolve({ ok: true });
      await Promise.resolve();
    });

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.connectionState).toBe(CONNECTION_STATE.CONNECTED);
  });

  it("disconnects after repeated failures and stops retrying on 401", async () => {
    const fetcher = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error("unauthorized"), { status: 401 }))
      .mockRejectedValue(Object.assign(new Error("should not retry"), { status: 500 }));

    const { result } = renderHook(() =>
      useObservabilityPolling(fetcher, {
        immediate: false,
        intervalMs: 1000,
        retryBaseDelayMs: 250,
        retryMaxDelayMs: 1000,
        maxConsecutiveFailures: 2
      })
    );

    await act(async () => {
      result.current.refresh().catch(() => {});
      await Promise.resolve();
    });

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.connectionState).toBe(CONNECTION_STATE.DISCONNECTED);
    expect(fetcher).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("pauses scheduled polling while hidden and resumes on visibility change", async () => {
    const request = deferred();
    const fetcher = vi.fn(() => request.promise);

    setVisibilityState("hidden");
    const { result, unmount } = renderHook(() =>
      useObservabilityPolling(fetcher, {
        immediate: false,
        intervalMs: 1000,
        pauseWhenHidden: true
      })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(fetcher).not.toHaveBeenCalled();

    setVisibilityState("visible");
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.current.connectionState).toBe(CONNECTION_STATE.REFRESHING);

    await act(async () => {
      request.resolve({ ok: true });
      await Promise.resolve();
    });

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.connectionState).toBe(CONNECTION_STATE.CONNECTED);

    unmount();
  });

  it("keeps an in-flight request alive when the tab becomes hidden", async () => {
    const request = deferred();
    const fetcher = vi.fn(() => request.promise);

    const { result } = renderHook(() =>
      useObservabilityPolling(fetcher, {
        immediate: false,
        intervalMs: 1000,
        pauseWhenHidden: true
      })
    );

    await act(async () => {
      result.current.refresh().catch(() => {});
    });

    expect(fetcher).toHaveBeenCalledTimes(1);

    setVisibilityState("hidden");
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await act(async () => {
      request.resolve({ ok: true });
      await Promise.resolve();
    });

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.connectionState).toBe(CONNECTION_STATE.CONNECTED);
    expect(result.current.lastSuccessfulRefreshAt).toBeTruthy();
  });
});
