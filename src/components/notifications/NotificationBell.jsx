import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  normalizeNotificationError
} from "../../services/notificationService";

const POLL_INTERVAL_MS = 30_000;
const PAGE_SIZE = 15;

function formatTimestamp(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Time unavailable";
  return parsed.toLocaleString("en-IE", { dateStyle: "medium", timeStyle: "short" });
}

function mergeUnique(previous, incoming) {
  const seen = new Set(previous.map(item => item.notificationId));
  return [...previous, ...incoming.filter(item => !seen.has(item.notificationId))];
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [pendingIds, setPendingIds] = useState(() => new Set());
  const [markingAll, setMarkingAll] = useState(false);
  const countRequestActive = useRef(false);
  const panelRef = useRef(null);

  const refreshUnreadCount = useCallback(async () => {
    if (countRequestActive.current || document.visibilityState === "hidden") return;
    countRequestActive.current = true;
    try {
      setUnreadCount(await getUnreadNotificationCount());
    } catch {
      // Keep the last known count; header availability must not depend on this request.
    } finally {
      countRequestActive.current = false;
    }
  }, []);

  useEffect(() => {
    const initialRequest = window.setTimeout(refreshUnreadCount, 0);
    const timer = window.setInterval(refreshUnreadCount, POLL_INTERVAL_MS);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refreshUnreadCount();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearTimeout(initialRequest);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKey = event => {
      if (event.key === "Escape") setOpen(false);
    };
    const handlePointer = event => {
      if (panelRef.current && !panelRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handlePointer);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handlePointer);
    };
  }, [open]);

  const loadPage = useCallback(async (nextPage, append = false) => {
    append ? setLoadingMore(true) : setLoading(true);
    setError(null);
    try {
      const result = await getNotifications({ page: nextPage, size: PAGE_SIZE });
      setItems(current => append ? mergeUnique(current, result.items) : result.items);
      setPage(result.page);
      setTotalPages(result.totalPages);
    } catch (requestError) {
      setError(normalizeNotificationError(requestError).message);
    } finally {
      append ? setLoadingMore(false) : setLoading(false);
    }
  }, []);

  async function togglePanel() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && items.length === 0 && !loading) await loadPage(0);
  }

  async function markRead(item) {
    if (item.readAt || pendingIds.has(item.notificationId)) return true;
    setPendingIds(current => new Set(current).add(item.notificationId));
    try {
      const updated = await markNotificationRead(item.notificationId);
      setItems(current => current.map(existing => existing.notificationId === item.notificationId
        ? { ...existing, ...updated }
        : existing));
      setUnreadCount(current => Math.max(0, current - 1));
      return true;
    } catch (requestError) {
      setError(normalizeNotificationError(requestError).message);
      return false;
    } finally {
      setPendingIds(current => {
        const next = new Set(current);
        next.delete(item.notificationId);
        return next;
      });
    }
  }

  async function viewAlert(item) {
    await markRead(item);
    setOpen(false);
    navigate(`/projects/${encodeURIComponent(item.projectId)}/alerts`);
  }

  async function markAllRead() {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    setError(null);
    try {
      await markAllNotificationsRead();
      const readAt = new Date().toISOString();
      setItems(current => current.map(item => item.readAt ? item : { ...item, readAt }));
      setUnreadCount(0);
    } catch (requestError) {
      setError(normalizeNotificationError(requestError).message);
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div className="notification-bell" ref={panelRef}>
      <button
        type="button"
        className="notification-bell-button"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
        aria-controls="notification-panel"
        onClick={togglePanel}
      >
        <span aria-hidden="true" className="notification-bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-count-badge" aria-label={`${unreadCount} unread notifications`}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section id="notification-panel" className="notification-panel" aria-label="Notifications">
          <div className="notification-panel-header">
            <div><span>Inbox</span><h2>Notifications</h2></div>
            <button type="button" className="notification-close" aria-label="Close notifications" onClick={() => setOpen(false)}>×</button>
          </div>

          {unreadCount > 0 && (
            <button type="button" className="notification-mark-all" disabled={markingAll} onClick={markAllRead}>
              {markingAll ? "Marking read…" : "Mark all as read"}
            </button>
          )}

          {error && <div className="notification-error" role="status"><span>{error}</span><button type="button" onClick={() => loadPage(0)}>Retry</button></div>}
          {loading && <div className="notification-loading" role="status"><span className="notification-spinner" />Loading notifications…</div>}
          {!loading && items.length === 0 && !error && <div className="notification-empty"><strong>You&apos;re all caught up.</strong><span>No notifications yet.</span></div>}

          {!loading && items.length > 0 && (
            <div className="notification-list">
              {items.map(item => {
                const unread = !item.readAt;
                const pending = pendingIds.has(item.notificationId);
                return (
                  <article key={item.notificationId} className={`notification-item ${unread ? "is-unread" : "is-read"}`}>
                    <div className="notification-item-meta">
                      <span className="notification-lifecycle">{item.eventType}</span>
                      <span className={`notification-severity severity-${String(item.severity).toLowerCase()}`}>{item.severity} severity</span>
                    </div>
                    <strong>{item.title}</strong>
                    <p>{item.message}</p>
                    <div className="notification-read-state">{unread ? "● Unread" : "Read"}</div>
                    <time dateTime={item.createdAt}>{formatTimestamp(item.createdAt)}</time>
                    <div className="notification-actions">
                      {unread && <button type="button" disabled={pending} onClick={() => markRead(item)}>{pending ? "Marking…" : "Mark read"}</button>}
                      {item.projectId && item.alertEventId && <button type="button" onClick={() => viewAlert(item)}>View alert</button>}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {!loading && page + 1 < totalPages && (
            <button type="button" className="notification-load-more" disabled={loadingMore} onClick={() => loadPage(page + 1, true)}>
              {loadingMore ? "Loading more…" : "Load more"}
            </button>
          )}
        </section>
      )}
    </div>
  );
}
