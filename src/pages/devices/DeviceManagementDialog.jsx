import { useEffect, useState } from "react";
import { getDeviceHistory, registerDevice, updateDevice } from "../../services/deviceService";

const blank = { name: "", type: "", ipAddress: "", description: "", location: "", firmwareVersion: "", operatingSystem: "" };

export default function DeviceManagementDialog({ mode, device, onClose, onSaved }) {
  const [form, setForm] = useState(mode === "edit" ? { ...blank, ...device, ipAddress: device.ipAddress || "" } : blank);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (mode === "history") getDeviceHistory(device.deviceId).then(setHistory).catch(() => setError("Unable to load lifecycle history.")); }, [mode, device]);
  async function submit(event) {
    event.preventDefault(); setError("");
    if (!form.name.trim() || !form.type.trim() || !form.ipAddress.trim()) { setError("Name, type and IP address are required."); return; }
    setBusy(true);
    try { await (mode === "new" ? registerDevice(form) : updateDevice(device.deviceId, form)); onSaved(mode === "new" ? "Device registered." : "Device metadata updated."); }
    catch (e) { setError(e.message || "Unable to save device."); }
    finally { setBusy(false); }
  }
  return <div className="device-management-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="device-dialog-title" className="device-management-dialog">
    <header><h2 id="device-dialog-title">{mode === "new" ? "Register Device" : mode === "edit" ? "Edit Device" : "Lifecycle History"}</h2><button aria-label="Close device dialog" onClick={onClose}>×</button></header>
    {error && <p role="alert" className="device-management-error">{error}</p>}
    {mode === "history" ? <ol className="device-history">{history.map(entry => <li key={entry.id}><strong>{entry.action}</strong><span>{new Date(entry.occurredAt).toLocaleString("en-IE")} · {entry.details}</span></li>)}{!error && history.length === 0 && <li>No lifecycle events recorded.</li>}</ol> :
      <form onSubmit={submit} className="device-management-form">
        <label>Name<input aria-label="Device name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
        <label>Type<input aria-label="Device type" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} /></label>
        <label>IP address<input aria-label="IP address" value={form.ipAddress} onChange={e => setForm({ ...form, ipAddress: e.target.value })} /></label>
        <label>Description<textarea value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
        <label>Location<input value={form.location || ""} onChange={e => setForm({ ...form, location: e.target.value })} /></label>
        <label>Firmware version<input value={form.firmwareVersion || ""} onChange={e => setForm({ ...form, firmwareVersion: e.target.value })} /></label>
        <label>Operating system<input value={form.operatingSystem || ""} onChange={e => setForm({ ...form, operatingSystem: e.target.value })} /></label>
        <footer><button type="button" onClick={onClose}>Cancel</button><button type="submit" disabled={busy}>{busy ? "Saving…" : "Save Device"}</button></footer>
      </form>}
  </section></div>;
}
