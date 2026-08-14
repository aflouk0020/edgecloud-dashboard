import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "../../context/AuthContext";
import { loginUser } from "../../services/authService";
import LoginPage from "./LoginPage";

vi.mock("../../services/authService", () => ({ loginUser: vi.fn() }));

describe("LoginPage", () => {
  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("accepts the demo admin credentials and navigates to the dashboard", async () => {
    loginUser.mockResolvedValue({ token: "valid.jwt.token", role: "ADMIN" });
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<h1>Administrator Dashboard</h1>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    await user.type(screen.getByLabelText("Email"), "dashboard.admin@edgecloud.com");
    await user.type(screen.getByLabelText("Password"), "Password123!");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(await screen.findByRole("heading", { name: "Administrator Dashboard" })).toBeInTheDocument();
    expect(loginUser).toHaveBeenCalledWith("dashboard.admin@edgecloud.com", "Password123!");
    expect(localStorage.getItem("role")).toBe("ADMIN");
  });
});
