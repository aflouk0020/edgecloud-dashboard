import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./apiClient";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  normalizeNotificationError
} from "./notificationService";

vi.mock("./apiClient", () => ({ apiRequest: vi.fn() }));

describe("notificationService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses bounded list query parameters and normalizes the page", async () => {
    apiRequest.mockResolvedValue({ items: [{ notificationId: "n-1" }], totalElements: 1, totalPages: 1 });
    const result = await getNotifications({ page: 2, size: 250, unread: true });
    expect(apiRequest).toHaveBeenCalledWith("/api/v2/notifications?page=2&size=100&unread=true");
    expect(result.items).toHaveLength(1);
  });

  it("uses shared authenticated API requests for count and read mutations", async () => {
    apiRequest.mockResolvedValueOnce({ unreadCount: 4 }).mockResolvedValue({ updatedCount: 2 });
    await expect(getUnreadNotificationCount()).resolves.toBe(4);
    await markNotificationRead("notification/id");
    await markAllNotificationsRead();
    expect(apiRequest).toHaveBeenNthCalledWith(1, "/api/v2/notifications/unread-count");
    expect(apiRequest).toHaveBeenNthCalledWith(2, "/api/v2/notifications/notification%2Fid/read", { method: "PATCH" });
    expect(apiRequest).toHaveBeenNthCalledWith(3, "/api/v2/notifications/read-all", { method: "PATCH" });
  });

  it("normalizes failures without exposing backend details", () => {
    expect(normalizeNotificationError(new Error("API request failed: 401 secret"))).toEqual({
      status: 401,
      message: "Your session has expired. Please sign in again."
    });
    expect(normalizeNotificationError(new Error("SMTP password leaked"))).toEqual({
      status: 0,
      message: "Notifications are temporarily unavailable. Please try again."
    });
  });
});
