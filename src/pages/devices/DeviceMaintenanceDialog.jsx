import { useEffect, useState } from "react";

import StatusBadge from "../../components/ui/StatusBadge";
import {
  disableDeviceMaintenance,
  enableDeviceMaintenance,
  getDeviceMaintenance,
  getDeviceMaintenanceHistory
} from "../../services/deviceService";

const formatDate = value => value
  ? new Intl.DateTimeFormat("en-IE", { dateStyle: "medium", timeStyle: "medium" }).format(new Date(value))
  : "Not scheduled";

export default function DeviceMaintenanceDialog({ device, projectId, role, onClose, onChanged }) {
  const [state, setState] = useState(null);
  const [history, setHistory] = useState([]);
  const [reason, setReason] = useState("");
  const [scheduledEndAt, setScheduledEndAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const canMutate = role === "ADMIN" || role === "OPERATOR";

  useEffect(() => {
    let active = true;
    Promise.all([
      getDeviceMaintenance(device.deviceId, projectId),
      getDeviceMaintenanceHistory(device.deviceId, projectId)
    ]).then(([current, events]) => {
      if (active) { setState(current); setHistory(events); }
    }).catch(exception => active && setError(exception.message || "Unable to load maintenance details."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [device.deviceId, projectId]);

  async function refresh(message) {
    const [current, events] = await Promise.all([
      getDeviceMaintenance(device.deviceId, projectId),
      getDeviceMaintenanceHistory(device.deviceId, projectId)
    ]);
    setState(current);
    setHistory(events);
    setFeedback(message);
    onChanged();
  }

  async function enable(event) {
    event.preventDefault();
    setError(""); setFeedback("");
    if (reason.length > 500) { setError("Maintenance reason must be 500 characters or fewer."); return; }
    if (scheduledEndAt && new Date(scheduledEndAt).getTime() <= Date.now()) {
      setError("Scheduled end must be in the future."); return;
    }
    if (!window.confirm(`Enable maintenance mode for ${device.name}?`)) return;
    setBusy(true);
    try {
      await enableDeviceMaintenance(device.deviceId, {
        reason: reason.trim() || null,
        scheduledEndAt: scheduledEndAt || null
      }, projectId);
      setReason(""); setScheduledEndAt("");
      await refresh("Maintenance mode enabled.");
    } catch (exception) {
      setError(exception.message || "Unable to enable maintenance mode.");
    } finally { setBusy(false); }
  }

  async function disable() {
    setError(""); setFeedback("");
    if (!window.confirm(`Disable maintenance mode for ${device.name}?`)) return;
    setBusy(true);
    try {
      await disableDeviceMaintenance(device.deviceId, projectId);
      await refresh("Maintenance mode disabled.");
    } catch (exception) {
      setError(exception.message || "Unable to disable maintenance mode.");
    } finally { setBusy(false); }
  }

  return <div className="device-management-backdrop">
    <section className="device-management-dialog device-maintenance-dialog" role="dialog" aria-modal="true" aria-labelledby="maintenance-title">
      <header><div><p>Operational availability</p><h2 id="maintenance-title">{device.name} maintenance</h2></div><button aria-label="Close maintenance details" onClick={onClose}>×</button></header>
      {loading ? <p role="status">Loading maintenance details…</p> : error && !state ? <p role="alert" className="device-management-error">{error}</p> : <>
        <div className="device-maintenance-summary">
          <StatusBadge variant={state.maintenanceMode ? "MAINTENANCE" : "AVAILABLE"}>{state.maintenanceMode ? "MAINTENANCE" : "NOT IN MAINTENANCE"}</StatusBadge>
          <dl>
            <div><dt>Reason</dt><dd>{state.reason || "No reason supplied"}</dd></div>
            <div><dt>Enabled</dt><dd>{state.enabledAt ? formatDate(state.enabledAt) : "Not enabled"}</dd></div>
            <div><dt>Enabled by</dt><dd>{state.enabledBy || "Not recorded"}</dd></div>
            <div><dt>Scheduled end</dt><dd>{formatDate(state.scheduledEndAt)}</dd></div>
          </dl>
          <p>Maintenance is intentional availability context. Lifecycle remains {device.active === false ? "inactive" : "active"}; heartbeat remains {device.heartbeatStatus || "independent"}.</p>
        </div>
        {error && <p role="alert" className="device-management-error">{error}</p>}
        {feedback && <p role="status" className="device-maintenance-success">{feedback}</p>}
        {canMutate && (state.maintenanceMode
          ? <button type="button" disabled={busy} onClick={disable}>{busy ? "Disabling…" : "Disable maintenance"}</button>
          : <form className="device-management-form" onSubmit={enable}>
              <label>Reason<textarea aria-label="Maintenance reason" maxLength="501" value={reason} onChange={event => setReason(event.target.value)} /></label>
              <label>Scheduled end (optional)<input aria-label="Scheduled maintenance end" type="datetime-local" value={scheduledEndAt} onChange={event => setScheduledEndAt(event.target.value)} /></label>
              <footer><button type="submit" disabled={busy}>{busy ? "Enabling…" : "Enable maintenance"}</button></footer>
            </form>)}
        {!canMutate && <p>This role has read-only access to maintenance information.</p>}
        <h3>Maintenance history</h3>
        {history.length === 0 ? <p>No maintenance events recorded.</p> : <ol className="device-history device-maintenance-history">
          {history.map(entry => <li key={entry.id} className={`maintenance-event-${entry.action.toLowerCase()}`}>
            <StatusBadge variant={entry.action}>{entry.action}</StatusBadge>
            <span>{formatDate(entry.occurredAt)} · {entry.reason || "No reason supplied"}{entry.actorUserId ? ` · ${entry.actorUserId}` : " · System"}</span>
          </li>)}
        </ol>}
      </>}
    </section>
  </div>;
}
