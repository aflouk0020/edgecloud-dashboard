import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ObservabilityFilterChips from "./ObservabilityFilterChips";

describe("ObservabilityFilterChips", () => {
  it("renders active filters and supports remove and clear all actions", () => {
    const onClearAll = vi.fn();
    const onRemoveSearch = vi.fn();
    const onRemoveStatus = vi.fn();

    render(
      <ObservabilityFilterChips
        chips={[
          { id: "search", label: "Search", value: "alpha", onRemove: onRemoveSearch },
          { id: "status", label: "Service health", value: "HEALTHY", status: "HEALTHY", onRemove: onRemoveStatus }
        ]}
        onClearAll={onClearAll}
      />
    );

    expect(screen.getByText("Active filters")).toBeInTheDocument();
    expect(screen.getByText("Search")).toBeInTheDocument();
    expect(screen.getByText("alpha")).toBeInTheDocument();
    expect(screen.getByLabelText("Remove Search")).toBeInTheDocument();
    expect(screen.getByText("HEALTHY", { selector: ".ui-status-badge" })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Remove Search"));
    expect(onRemoveSearch).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(onClearAll).toHaveBeenCalledTimes(1);

    expect(screen.getByLabelText("Remove Service health")).toBeInTheDocument();
  });
});
