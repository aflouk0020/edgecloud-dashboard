import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ObservabilityConnectionStatus from "./ObservabilityConnectionStatus";

describe("ObservabilityConnectionStatus", () => {
  it("renders the status, timestamp and warning text", () => {
    render(
      <ObservabilityConnectionStatus
        status="DEGRADED"
        lastSuccessfulRefreshAt="2026-08-04T10:00:00Z"
        warning="Some sources are temporarily unavailable."
      />
    );

    expect(screen.getByLabelText("Observability connection status Degraded")).toBeInTheDocument();
    expect(screen.getByText("Last successful refresh")).toBeInTheDocument();
    expect(screen.getByText("Some sources are temporarily unavailable.")).toBeInTheDocument();
  });

  it("falls back to a safe disconnected state when the status is unknown", () => {
    render(<ObservabilityConnectionStatus status="UNKNOWN_STATUS" />);

    expect(screen.getByLabelText("Observability connection status Disconnected")).toBeInTheDocument();
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
  });
});

