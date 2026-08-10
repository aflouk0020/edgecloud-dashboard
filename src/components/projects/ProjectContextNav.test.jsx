import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ProjectContextNav from "./ProjectContextNav";

describe("ProjectContextNav", () => {
  it("preserves query parameters while moving across observability tabs", () => {
    render(
      <MemoryRouter initialEntries={["/projects/project-1/workspace?q=alpha&service=service-1"]}>
        <Routes>
          <Route
            path="/projects/:projectId/workspace"
            element={<ProjectContextNav active="workspace" />}
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "Observability" })).toHaveAttribute(
      "href",
      "/projects/project-1/workspace?q=alpha&service=service-1"
    );
    expect(screen.getByRole("link", { name: "Services" })).toHaveAttribute(
      "href",
      "/projects/project-1/services?q=alpha&service=service-1"
    );
    expect(screen.getByRole("link", { name: "Devices" })).toHaveAttribute(
      "href",
      "/projects/project-1/devices?q=alpha&service=service-1"
    );
    expect(screen.getByRole("link", { name: "Metrics" })).toHaveAttribute(
      "href",
      "/projects/project-1/metrics?q=alpha&service=service-1"
    );
    expect(screen.getByRole("link", { name: "Alert Rules" })).toHaveAttribute(
      "href",
      "/projects/project-1/alert-rules?q=alpha&service=service-1"
    );
    expect(screen.getByRole("link", { name: "Alerts" })).toHaveAttribute(
      "href",
      "/projects/project-1/alerts?q=alpha&service=service-1"
    );
    expect(screen.getByRole("link", { name: "Back to dashboard" })).toHaveAttribute(
      "href",
      "/dashboard"
    );
  });
});
