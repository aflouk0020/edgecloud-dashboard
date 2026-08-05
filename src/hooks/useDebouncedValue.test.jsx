import React from "react";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import useDebouncedValue from "./useDebouncedValue";

describe("useDebouncedValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("debounces to the latest value and cleans up on unmount", async () => {
    const { result, rerender, unmount } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: "alpha" }
    });

    expect(result.current).toBe("alpha");

    rerender({ value: "bravo" });
    rerender({ value: "charlie" });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(299);
    });
    expect(result.current).toBe("alpha");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(result.current).toBe("charlie");

    rerender({ value: "delta" });
    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current).toBe("charlie");
  });
});
