import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { AuthProvider } from "../../context/AuthContext";
import Sidebar from "./Sidebar";

describe("Sidebar device inventory navigation", () => {
  afterEach(() => localStorage.clear());

  it("shows inventory to administrators and operators", () => {
    localStorage.setItem("role", "ADMIN");
    render(<AuthProvider><MemoryRouter><Sidebar /></MemoryRouter></AuthProvider>);
    expect(screen.getByRole("link", { name: /Device Inventory/ })).toHaveAttribute("href", "/devices");
  });

  it("shows project-scoped inventory to project administrators", () => {
    localStorage.setItem("role", "PROJECT_ADMIN");
    render(<AuthProvider><MemoryRouter><Sidebar /></MemoryRouter></AuthProvider>);
    expect(screen.getByRole("link", { name: /Device Inventory/ })).toBeInTheDocument();
  });

  it("hides global inventory from viewers", () => {
    localStorage.setItem("role", "VIEWER");
    render(<AuthProvider><MemoryRouter><Sidebar /></MemoryRouter></AuthProvider>);
    expect(screen.queryByRole("link", { name: /Device Inventory/ })).not.toBeInTheDocument();
  });
});
