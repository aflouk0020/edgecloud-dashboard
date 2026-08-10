import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./components/common/ProtectedRoute", () => ({ default: ({ children }) => children }));
vi.mock("./components/layout/DashboardLayout", () => ({ default: ({ children }) => <>{children}</> }));
vi.mock("./pages/projects/ProjectAlertsPage", () => ({ default: () => <h1>Project alert events</h1> }));
vi.mock("./pages/alerts/AlertsPage", () => ({ default: () => <h1>Legacy active alerts</h1> }));

import App from "./App";

describe("alert routes", () => {
  it("renders the project-scoped alert-event route", () => {
    render(<MemoryRouter initialEntries={["/projects/project-1/alerts"]}><App /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Project alert events" })).toBeInTheDocument();
  });

  it("preserves the legacy global alerts route", () => {
    render(<MemoryRouter initialEntries={["/alerts"]}><App /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Legacy active alerts" })).toBeInTheDocument();
  });
});
