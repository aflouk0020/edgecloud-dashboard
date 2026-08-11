import { apiRequest } from "./apiClient";

const DEFAULT_PAGE = 0;
const DEFAULT_SIZE = 15;
const MAX_SIZE = 100;

export function getNotifications({ page = DEFAULT_PAGE, size = DEFAULT_SIZE, unread } = {}) {
  const params = new URLSearchParams({
    page: String(Math.max(0, Number(page) || 0)),
    size: String(Math.min(MAX_SIZE, Math.max(1, Number(size) || DEFAULT_SIZE)))
  });
  if (typeof unread === "boolean") params.set("unread", String(unread));
  return apiRequest(`/api/v2/notifications?${params}`).then(payload => ({
    items: payload.items ?? [],
    page: payload.page ?? DEFAULT_PAGE,
    size: payload.size ?? DEFAULT_SIZE,
    totalElements: payload.totalElements ?? 0,
    totalPages: payload.totalPages ?? 0
  }));
}

export function getUnreadNotificationCount() {
  return apiRequest("/api/v2/notifications/unread-count")
    .then(payload => Math.max(0, Number(payload.unreadCount) || 0));
}

export function markNotificationRead(notificationId) {
  return apiRequest(`/api/v2/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: "PATCH"
  });
}

export function markAllNotificationsRead() {
  return apiRequest("/api/v2/notifications/read-all", { method: "PATCH" });
}

export function normalizeNotificationError(error) {
  const status = error?.status || Number(String(error?.message || "").match(/(\d{3})/)?.[1] || 0);
  if (status === 401) return { status, message: "Your session has expired. Please sign in again." };
  if (status === 400) return { status, message: "The notification request was not valid." };
  return { status, message: "Notifications are temporarily unavailable. Please try again." };
}
