import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import ProjectContextNav from "../../components/projects/ProjectContextNav";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import LoadingState from "../../components/ui/LoadingState";
import StatusBadge from "../../components/ui/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { getProjectWorkspace, normalizeWorkspaceError } from "../../services/projectWorkspaceService";
import { createMaintenanceWindow, deleteMaintenanceWindow, getMaintenanceSuppressions, getMaintenanceWindows, normalizeMaintenanceWindowError, updateMaintenanceWindow } from "../../services/maintenanceWindowService";

const initialForm = () => ({ scopeType: "PROJECT", serviceId: "", deviceId: "", name: "", reason: "", startsAt: "", endsAt: "", enabled: true });
const localDateTime = value => value ? new Date(value).toISOString().slice(0, 16) : "";
const displayDate = value => new Intl.DateTimeFormat("en-IE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const target = window => window.scopeType === "PROJECT" ? "Entire project" : window.scopeType === "SERVICE" ? `Service ${window.serviceId}` : `Device ${window.deviceId}`;
const payload = form => ({ ...form, serviceId: form.scopeType === "SERVICE" ? form.serviceId : null, deviceId: form.scopeType === "DEVICE" ? form.deviceId.trim() : null, name: form.name.trim(), reason: form.reason.trim(), startsAt: new Date(form.startsAt).toISOString(), endsAt: new Date(form.endsAt).toISOString() });

function WindowForm({ form, setForm, workspace, busy, onSubmit, onCancel }) {
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));
  return <form className="maintenance-form" onSubmit={onSubmit}>
    <label>Name<input required maxLength={200} value={form.name} onChange={e => set("name", e.target.value)} /></label>
    <label>Scope<select value={form.scopeType} onChange={e => set("scopeType", e.target.value)}><option value="PROJECT">Project</option><option value="SERVICE">Service</option><option value="DEVICE">Device</option></select></label>
    {form.scopeType === "SERVICE" && <label>Service<select required value={form.serviceId} onChange={e => set("serviceId", e.target.value)}><option value="">Select service</option>{workspace.serviceIds.map(id => <option key={id}>{id}</option>)}</select></label>}
    {form.scopeType === "DEVICE" && <label>Device<select required value={form.deviceId} onChange={e => set("deviceId", e.target.value)}><option value="">Select device</option>{workspace.deviceIds.map(id => <option key={id}>{id}</option>)}</select></label>}
    <label>Starts<input required type="datetime-local" value={form.startsAt} onChange={e => set("startsAt", e.target.value)} /></label>
    <label>Ends<input required type="datetime-local" value={form.endsAt} onChange={e => set("endsAt", e.target.value)} /></label>
    <label className="maintenance-reason">Reason<textarea required maxLength={1000} value={form.reason} onChange={e => set("reason", e.target.value)} /></label>
    <label><input type="checkbox" checked={form.enabled} onChange={e => set("enabled", e.target.checked)} /> Enabled</label>
    <div className="maintenance-actions"><button type="button" onClick={onCancel}>Cancel</button><button className="primary-action" disabled={busy}>Save window</button></div>
  </form>;
}

export default function ProjectMaintenanceWindowsPage() {
  const { projectId } = useParams();
  const { role } = useAuth();
  const [workspace, setWorkspace] = useState(null);
  const [windows, setWindows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm());
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState({});
  const canManage = useMemo(() => workspace?.projectStatus !== "ARCHIVED" && (role === "ADMIN" || workspace?.callerProjectRole === "PROJECT_ADMIN"), [role, workspace]);

  useEffect(() => { let active = true; Promise.all([getProjectWorkspace(projectId), getMaintenanceWindows(projectId)])
    .then(([w, list]) => { if (active) { setWorkspace(w); setWindows(list); } })
    .catch(e => { if (active) setError(e?.status ? normalizeWorkspaceError(e) : normalizeMaintenanceWindowError(e)); })
    .finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [projectId]);

  const openCreate = () => { setEditing("new"); setForm(initialForm()); };
  const openEdit = window => { setEditing(window); setForm({ scopeType: window.scopeType, serviceId: window.serviceId || "", deviceId: window.deviceId || "", name: window.name, reason: window.reason, startsAt: localDateTime(window.startsAt), endsAt: localDateTime(window.endsAt), enabled: window.enabled }); };
  const submit = async e => { e.preventDefault(); if (new Date(form.endsAt) <= new Date(form.startsAt)) { setError({ title: "Invalid maintenance window", message: "End time must be after start time." }); return; } setBusy(true); setError(null); try { const saved = editing === "new" ? await createMaintenanceWindow(projectId, payload(form)) : await updateMaintenanceWindow(projectId, editing.id, payload(form)); setWindows(current => editing === "new" ? [saved, ...current] : current.map(w => w.id === saved.id ? saved : w)); setEditing(null); } catch (e2) { setError(normalizeMaintenanceWindowError(e2)); } finally { setBusy(false); } };
  const disable = async window => { if (!globalThis.confirm(`Disable maintenance window "${window.name}"?`)) return; setBusy(true); try { await deleteMaintenanceWindow(projectId, window.id); setWindows(current => current.map(w => w.id === window.id ? { ...w, enabled: false, status: "DISABLED" } : w)); } catch (e) { setError(normalizeMaintenanceWindowError(e)); } finally { setBusy(false); } };
  const toggleHistory = async window => { if (history[window.id]) { setHistory(current => { const next = { ...current }; delete next[window.id]; return next; }); return; } setHistory(current => ({ ...current, [window.id]: { loading: true, entries: [] } })); try { const entries = await getMaintenanceSuppressions(projectId, window.id); setHistory(current => ({ ...current, [window.id]: { loading: false, entries } })); } catch { setHistory(current => ({ ...current, [window.id]: { loading: false, entries: [], error: true } })); } };

  if (loading) return <DashboardLayout><LoadingState message="Loading maintenance windows..." /></DashboardLayout>;
  if (!workspace) return <DashboardLayout><ErrorState title={error?.title} message={error?.message} /></DashboardLayout>;
  return <DashboardLayout><section className="maintenance-page"><ProjectContextNav active="maintenance" />
    <header className="maintenance-header"><div><p className="eyebrow">{workspace.projectName}</p><h2>Maintenance Windows</h2><p>Suppress alert generation during planned work while monitoring and telemetry continue normally.</p></div>{canManage && <button className="primary-action" onClick={openCreate}>Create window</button>}</header>
    {error && <ErrorState title={error.title} message={error.message} />}
    {!windows.length && <EmptyState title="No maintenance windows" message="Planned maintenance windows will appear here." action={canManage ? <button className="primary-action" onClick={openCreate}>Create window</button> : null} />}
    <div className="maintenance-list">{windows.map(window => <article key={window.id} className="maintenance-card"><header><div><h3>{window.name}</h3><p>{window.reason}</p></div><StatusBadge variant={window.status}>{window.status}</StatusBadge></header><dl><div><dt>Scope</dt><dd>{target(window)}</dd></div><div><dt>Starts</dt><dd>{displayDate(window.startsAt)}</dd></div><div><dt>Ends</dt><dd>{displayDate(window.endsAt)}</dd></div><div><dt>Suppressed conditions</dt><dd>{window.suppressionCount}</dd></div></dl><div className="maintenance-actions"><button onClick={() => toggleHistory(window)}>Suppression history</button>{canManage && <><button disabled={busy} onClick={() => openEdit(window)}>Edit</button>{window.enabled && <button disabled={busy} onClick={() => disable(window)}>Disable</button>}</>}</div>{history[window.id] && <section className="suppression-history"><h4>Suppression timeline</h4>{history[window.id].loading && <LoadingState message="Loading suppression history..." />}{history[window.id].error && <p role="alert">Unable to load suppression history.</p>}{!history[window.id].loading && !history[window.id].entries.length && <p>No suppressed conditions recorded.</p>}<ol>{history[window.id].entries.map(item => <li key={item.id}><strong>{item.ruleName}</strong><span>{item.sourceType} · {item.sourceId} · {item.metricType}</span><span>{item.observedValue} vs {item.thresholdValue}</span><time dateTime={item.suppressedAt}>{displayDate(item.suppressedAt)}</time></li>)}</ol></section>}</article>)}</div>
    {editing && <div className="maintenance-dialog-backdrop"><div role="dialog" aria-modal="true" className="maintenance-dialog"><h3>{editing === "new" ? "Create maintenance window" : "Edit maintenance window"}</h3><WindowForm form={form} setForm={setForm} workspace={workspace} busy={busy} onSubmit={submit} onCancel={() => setEditing(null)} /></div></div>}
  </section></DashboardLayout>;
}
