import { afterEach, describe, expect, it, vi } from "vitest";

import { loginUser } from "./authService";

describe("loginUser", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("logs in through the browser-facing API Gateway route", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ token: "jwt", role: "ADMIN" })
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(loginUser("dashboard.admin@edgecloud.com", "Password123!"))
      .resolves.toEqual({ token: "jwt", role: "ADMIN" });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8095/api/v1/auth/login",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("preserves an authentication rejection message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ message: "Invalid credentials" })
    }));

    await expect(loginUser("user@example.com", "wrong"))
      .rejects.toThrow("Invalid credentials");
  });

  it("reports Gateway connectivity failures clearly", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Load failed")));

    await expect(loginUser("user@example.com", "password"))
      .rejects.toThrow("Unable to reach the authentication service");
  });
});
