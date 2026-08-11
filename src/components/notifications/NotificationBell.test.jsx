import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NotificationBell from "./NotificationBell";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead
} from "../../services/notificationService";

vi.mock("../../services/notificationService", () => ({
  getNotifications: vi.fn(),
  getUnreadNotificationCount: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  markNotificationRead: vi.fn(),
  normalizeNotificationError: () => ({ message: "Notifications are temporarily unavailable. Please try again." })
}));

const unread = {
  notificationId: "n-1",
  alertEventId: "a-1",
  projectId: "project-1",
  eventType: "OPENED",
  severity: "HIGH",
  title: "CPU alert opened",
  message: "CPU crossed its threshold.",
  readAt: null,
  createdAt: "2026-08-11T10:00:00Z"
};

function Location() {
  return <div data-testid="location">{useLocation().pathname}</div>;
}

function renderBell() {
  return render(
    <MemoryRouter>
      <NotificationBell />
      <Routes><Route path="*" element={<Location />} /></Routes>
    </MemoryRouter>
  );
}

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUnreadNotificationCount.mockResolvedValue(1);
    getNotifications.mockResolvedValue({ items: [unread], page: 0, totalPages: 1 });
    markNotificationRead.mockResolvedValue({ ...unread, readAt: "2026-08-11T10:01:00Z" });
    markAllNotificationsRead.mockResolvedValue({ updatedCount: 1 });
  });

  afterEach(() => vi.useRealTimers());

  it("shows capped badge and opens and closes an accessible populated panel", async () => {
    getUnreadNotificationCount.mockResolvedValue(120);
    renderBell();
    expect(await screen.findByText("99+")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /notifications, 120 unread/i }));
    expect(await screen.findByRole("region", { name: "Notifications" })).toBeInTheDocument();
    expect(screen.getByText("OPENED")).toBeInTheDocument();
    expect(screen.getByText("HIGH severity")).toBeInTheDocument();
    expect(screen.getByText("● Unread")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close notifications" }));
    expect(screen.queryByRole("region", { name: "Notifications" })).not.toBeInTheDocument();
  });

  it("hides a zero badge and renders empty and error retry states", async () => {
    getUnreadNotificationCount.mockResolvedValue(0);
    getNotifications.mockResolvedValueOnce({ items: [], page: 0, totalPages: 0 });
    renderBell();
    await waitFor(() => expect(getUnreadNotificationCount).toHaveBeenCalled());
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
    expect(await screen.findByText("You're all caught up.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close notifications" }));
    getNotifications.mockRejectedValueOnce(new Error("secret backend error")).mockResolvedValueOnce({ items: [], page: 0, totalPages: 0 });
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
    expect(await screen.findByText("Notifications are temporarily unavailable. Please try again.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(getNotifications).toHaveBeenCalledTimes(3));
  });

  it("marks one read once, decrements the badge, and navigates to project alerts", async () => {
    let resolveRead;
    markNotificationRead.mockReturnValue(new Promise(resolve => { resolveRead = resolve; }));
    renderBell();
    fireEvent.click(await screen.findByRole("button", { name: /notifications, 1 unread/i }));
    await screen.findByText("CPU alert opened");
    const markButton = screen.getByRole("button", { name: "Mark read" });
    fireEvent.click(markButton);
    fireEvent.click(markButton);
    expect(markNotificationRead).toHaveBeenCalledTimes(1);
    await act(async () => resolveRead({ ...unread, readAt: "2026-08-11T10:01:00Z" }));
    await waitFor(() => expect(screen.queryByText("● Unread")).not.toBeInTheDocument());
    expect(screen.queryByText("1")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View alert" }));
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/projects/project-1/alerts"));
  });

  it("marks all read and hides the action when no unread notifications remain", async () => {
    renderBell();
    fireEvent.click(await screen.findByRole("button", { name: /notifications, 1 unread/i }));
    await screen.findByText("CPU alert opened");
    fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
    await waitFor(() => expect(markAllNotificationsRead).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("button", { name: "Mark all as read" })).not.toBeInTheDocument();
    expect(screen.getByText("Read")).toBeInTheDocument();
  });

  it("loads another bounded page, preserves rows, and removes duplicates", async () => {
    getNotifications
      .mockResolvedValueOnce({ items: [unread], page: 0, totalPages: 2 })
      .mockResolvedValueOnce({ items: [unread, { ...unread, notificationId: "n-2", title: "Alert resolved", eventType: "RESOLVED" }], page: 1, totalPages: 2 });
    renderBell();
    fireEvent.click(await screen.findByRole("button", { name: /notifications/i }));
    await screen.findByText("CPU alert opened");
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(await screen.findByText("Alert resolved")).toBeInTheDocument();
    expect(screen.getAllByText("CPU alert opened")).toHaveLength(1);
    expect(getNotifications).toHaveBeenLastCalledWith({ page: 1, size: 15 });
  });

  it("polls every 30 seconds without overlap, resumes visibility, and cleans up", async () => {
    vi.useFakeTimers();
    let resolveCount;
    getUnreadNotificationCount.mockReturnValue(new Promise(resolve => { resolveCount = resolve; }));
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderBell();
    await act(async () => vi.advanceTimersByTime(90_000));
    expect(getUnreadNotificationCount).toHaveBeenCalledTimes(1);
    await act(async () => resolveCount(2));
    await act(async () => vi.advanceTimersByTime(30_000));
    expect(getUnreadNotificationCount).toHaveBeenCalledTimes(2);
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    removeSpy.mockRestore();
  });

  it("pauses count requests while hidden and refreshes when the tab becomes visible", async () => {
    vi.useFakeTimers();
    const originalVisibility = Object.getOwnPropertyDescriptor(document, "visibilityState");
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    const { unmount } = renderBell();
    await act(async () => vi.advanceTimersByTime(60_000));
    expect(getUnreadNotificationCount).not.toHaveBeenCalled();
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    await act(async () => document.dispatchEvent(new Event("visibilitychange")));
    expect(getUnreadNotificationCount).toHaveBeenCalledTimes(1);
    unmount();
    if (originalVisibility) Object.defineProperty(document, "visibilityState", originalVisibility);
  });
});
