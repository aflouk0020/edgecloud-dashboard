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
import {
  createProjectAlertRule,
  deleteProjectAlertRule,
  getProjectAlertRules,
  normalizeProjectAlertRuleError,
  updateProjectAlertRule,
  updateProjectAlertRuleEnabled
} from "../../services/projectAlertRuleService";

const METRIC_TYPES = ["CPU_USAGE", "MEMORY_USAGE", "TEMPERATURE", "RESPONSE_TIME_MS", "STATUS_CODE"];
const OPERATORS = ["GREATER_THAN", "LESS_THAN", "GREATER_THAN_OR_EQUAL", "LESS_THAN_OR_EQUAL", "EQUAL"];
const SEVERITIES = ["LOW", "MEDIUM", "HIGH"];
const MUTATION_ROLES = ["ADMIN", "PROJECT_ADMIN", "OPERATOR"];

function label(value) {
  return String(value || "").replaceAll("_", " ");
}

function formatDate(value) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en-IE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function targetLabel(rule) {
  if (rule.deviceId) return `Device: ${rule.deviceId}`;
  if (rule.serviceId) return `Service: ${rule.serviceId}`;
  return "Project-wide";
}

function emptyForm() {
  return {
    name: "",
    description: "",
    metricType: "CPU_USAGE",
    thresholdValue: "",
    comparisonOperator: "GREATER_THAN",
    severity: "MEDIUM",
    enabled: true,
    targetType: "PROJECT",
    deviceId: "",
    serviceId: ""
  };
}

function formFromRule(rule) {
  return {
    name: rule.name || "",
    description: rule.description || "",
    metricType: rule.metricType || "CPU_USAGE",
    thresholdValue: rule.thresholdValue ?? "",
    comparisonOperator: rule.comparisonOperator || "GREATER_THAN",
    severity: rule.severity || "MEDIUM",
    enabled: Boolean(rule.enabled),
    targetType: rule.deviceId ? "DEVICE" : rule.serviceId ? "SERVICE" : "PROJECT",
    deviceId: rule.deviceId || "",
    serviceId: rule.serviceId || ""
  };
}

function toPayload(form) {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    metricType: form.metricType,
    thresholdValue: Number(form.thresholdValue),
    comparisonOperator: form.comparisonOperator,
    severity: form.severity,
    enabled: form.enabled,
    deviceId: form.targetType === "DEVICE" ? form.deviceId : null,
    serviceId: form.targetType === "SERVICE" ? form.serviceId : null
  };
}

function validateForm(form) {
  if (!form.name.trim()) return "Name is required.";
  if (form.name.trim().length > 200) return "Name must not exceed 200 characters.";
  if (form.description.length > 2000) return "Description must not exceed 2,000 characters.";
  if (form.thresholdValue === "" || !Number.isFinite(Number(form.thresholdValue))) return "Threshold must be a valid number.";
  if (!METRIC_TYPES.includes(form.metricType)) return "Metric type is required.";
  if (!OPERATORS.includes(form.comparisonOperator)) return "Comparison operator is required.";
  if (!SEVERITIES.includes(form.severity)) return "Severity is required.";
  if (form.targetType === "DEVICE" && !form.deviceId) return "Select a device target.";
  if (form.targetType === "SERVICE" && !form.serviceId) return "Select a service target.";
  return "";
}

function RuleForm({ form, setForm, devices, services, saving, onSubmit, onCancel, error }) {
  const update = (field, value) => setForm(current => ({ ...current, [field]: value }));

  return (
    <form className="alert-rule-form" onSubmit={onSubmit}>
      <div className="alert-rule-form-grid">
        <label>Name<input value={form.name} maxLength={200} onChange={event => update("name", event.target.value)} /></label>
        <label>Metric type<select value={form.metricType} onChange={event => update("metricType", event.target.value)}>{METRIC_TYPES.map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Description<textarea value={form.description} maxLength={2000} onChange={event => update("description", event.target.value)} /></label>
        <label>Threshold<input type="number" step="any" value={form.thresholdValue} onChange={event => update("thresholdValue", event.target.value)} /></label>
        <label>Comparison operator<select value={form.comparisonOperator} onChange={event => update("comparisonOperator", event.target.value)}>{OPERATORS.map(value => <option key={value}>{label(value)}</option>)}</select></label>
        <label>Severity<select value={form.severity} onChange={event => update("severity", event.target.value)}>{SEVERITIES.map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Target<select value={form.targetType} onChange={event => update("targetType", event.target.value)}><option value="PROJECT">Project-wide</option><option value="DEVICE">Device</option><option value="SERVICE">Service</option></select></label>
        {form.targetType === "DEVICE" && <label>Device<select value={form.deviceId} onChange={event => update("deviceId", event.target.value)}><option value="">Select device</option>{devices.map(id => <option key={id} value={id}>{id}</option>)}</select></label>}
        {form.targetType === "SERVICE" && <label>Service<select value={form.serviceId} onChange={event => update("serviceId", event.target.value)}><option value="">Select service</option>{services.map(id => <option key={id} value={id}>{id}</option>)}</select></label>}
      </div>
      <label className="alert-rule-enabled-input"><input type="checkbox" checked={form.enabled} onChange={event => update("enabled", event.target.checked)} /> Enabled</label>
      {error && <p className="alert-rule-form-error" role="alert">{error}</p>}
      <div className="alert-rule-dialog-actions"><button type="button" onClick={onCancel}>Cancel</button><button className="primary-action" disabled={saving} type="submit">{saving ? "Saving..." : "Save Rule"}</button></div>
    </form>
  );
}

export default function ProjectAlertRulesPage() {
  const { projectId } = useParams();
  const { role } = useAuth();
  const [workspace, setWorkspace] = useState(null);
  const [workspaceError, setWorkspaceError] = useState(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [rules, setRules] = useState([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesError, setRulesError] = useState(null);
  const [dialogRule, setDialogRule] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState("");
  const [feedback, setFeedback] = useState("");
  const canMutate = MUTATION_ROLES.includes(role) && workspace?.projectStatus !== "ARCHIVED";

  useEffect(() => {
    let active = true;
    setWorkspaceLoading(true);
    setWorkspace(null);
    setWorkspaceError(null);
    setRules([]);
    setRulesError(null);
    getProjectWorkspace(projectId)
      .then(result => { if (active) setWorkspace(result); })
      .catch(error => { if (active) setWorkspaceError(normalizeWorkspaceError(error)); })
      .finally(() => { if (active) setWorkspaceLoading(false); });
    return () => { active = false; };
  }, [projectId]);

  useEffect(() => {
    if (!workspace) return undefined;
    let active = true;
    setRulesLoading(true);
    getProjectAlertRules(projectId)
      .then(result => { if (active) setRules(Array.isArray(result) ? result : []); })
      .catch(error => { if (active) setRulesError(normalizeProjectAlertRuleError(error)); })
      .finally(() => { if (active) setRulesLoading(false); });
    return () => { active = false; };
  }, [projectId, workspace]);

  const devices = useMemo(() => Array.isArray(workspace?.deviceIds) ? workspace.deviceIds : [], [workspace]);
  const services = useMemo(() => Array.isArray(workspace?.serviceIds) ? workspace.serviceIds : [], [workspace]);

  function openCreate() { setDialogRule("new"); setForm(emptyForm()); setFormError(""); }
  function openEdit(rule) { setDialogRule(rule); setForm(formFromRule(rule)); setFormError(""); }
  function closeDialog() { if (!saving) setDialogRule(null); }

  async function submit(event) {
    event.preventDefault();
    const validationError = validateForm(form);
    if (validationError) { setFormError(validationError); return; }
    setSaving(true); setFormError(""); setFeedback("");
    try {
      const payload = toPayload(form);
      const result = dialogRule === "new"
        ? await createProjectAlertRule(projectId, payload)
        : await updateProjectAlertRule(projectId, dialogRule.id, payload);
      setRules(current => dialogRule === "new" ? [result, ...current] : current.map(rule => rule.id === result.id ? result : rule));
      setFeedback(dialogRule === "new" ? "Alert rule created." : "Alert rule updated.");
      setDialogRule(null);
    } catch (error) { setFormError(normalizeProjectAlertRuleError(error).message); } finally { setSaving(false); }
  }

  async function toggleRule(rule) {
    if (pendingId) return;
    setPendingId(rule.id); setFeedback("");
    try {
      const result = await updateProjectAlertRuleEnabled(projectId, rule.id, !rule.enabled);
      setRules(current => current.map(entry => entry.id === result.id ? result : entry));
      setFeedback(`Alert rule ${result.enabled ? "enabled" : "disabled"}.`);
    } catch (error) { setRulesError(normalizeProjectAlertRuleError(error)); } finally { setPendingId(""); }
  }

  async function deleteRule(rule) {
    if (!window.confirm(`Delete alert rule "${rule.name}"?`)) return;
    setPendingId(rule.id); setFeedback("");
    try { await deleteProjectAlertRule(projectId, rule.id); setRules(current => current.filter(entry => entry.id !== rule.id)); setFeedback("Alert rule deleted."); }
    catch (error) { setRulesError(normalizeProjectAlertRuleError(error)); }
    finally { setPendingId(""); }
  }

  if (workspaceLoading) return <DashboardLayout><section className="project-alert-rules-page"><LoadingState message="Loading project workspace..." /></section></DashboardLayout>;
  if (workspaceError) return <DashboardLayout><section className="project-alert-rules-page"><ErrorState title={workspaceError.title} message={workspaceError.message} /></section></DashboardLayout>;

  return (
    <DashboardLayout>
      <section className="project-alert-rules-page">
        <ProjectContextNav active="alert-rules" />
        <header className="project-alert-rules-header">
          <div><p className="eyebrow">{workspace.projectName || "Project"}</p><h2>Alert Rules</h2><p>Configure threshold rules for this project.</p></div>
          {canMutate && <button className="primary-action" type="button" onClick={openCreate}>Create Rule</button>}
        </header>
        <div className="project-alert-rules-context"><span>Project status</span><StatusBadge variant={workspace.projectStatus}>{workspace.projectStatus}</StatusBadge><strong>{rules.length} {rules.length === 1 ? "rule" : "rules"}</strong></div>
        {feedback && <div className="alert-rule-feedback" role="status">{feedback}</div>}
        {rulesError && <ErrorState title={rulesError.title} message={rulesError.message} action={<button type="button" onClick={() => setWorkspace({ ...workspace })}>Retry</button>} />}
        {!rulesError && rulesLoading && <LoadingState message="Loading alert rules..." />}
        {!rulesError && !rulesLoading && rules.length === 0 && <EmptyState title="No alert rules" message="Create a project-wide, device, or service rule to begin managing thresholds." action={canMutate ? <button className="primary-action" type="button" onClick={openCreate}>Create Rule</button> : null} />}
        {!rulesError && !rulesLoading && rules.length > 0 && <>
          <div className="alert-rule-table-wrap"><table className="alert-rule-table"><thead><tr><th>Name</th><th>Metric</th><th>Threshold</th><th>Severity</th><th>Target</th><th>Status</th><th>Updated</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{rules.map(rule => <tr key={rule.id}><td><strong>{rule.name}</strong>{rule.description && <small>{rule.description}</small>}</td><td>{label(rule.metricType)}</td><td>{label(rule.comparisonOperator)} {rule.thresholdValue}</td><td><StatusBadge variant={rule.severity}>{rule.severity}</StatusBadge></td><td>{targetLabel(rule)}</td><td><StatusBadge variant={rule.enabled ? "active" : "inactive"}>{rule.enabled ? "Enabled" : "Disabled"}</StatusBadge></td><td>{formatDate(rule.updatedAt)}</td><td className="alert-rule-actions">{canMutate && <><button type="button" disabled={pendingId === rule.id} onClick={() => openEdit(rule)}>Edit</button><button type="button" disabled={pendingId === rule.id} onClick={() => toggleRule(rule)}>{rule.enabled ? "Disable" : "Enable"}</button><button type="button" disabled={pendingId === rule.id} onClick={() => deleteRule(rule)}>Delete</button></>}</td></tr>)}</tbody></table></div>
          <div className="alert-rule-card-list">{rules.map(rule => <article className="alert-rule-card" key={rule.id}><div className="alert-rule-card-header"><strong>{rule.name}</strong><StatusBadge variant={rule.enabled ? "active" : "inactive"}>{rule.enabled ? "Enabled" : "Disabled"}</StatusBadge></div><p>{rule.description || "No description"}</p><dl><div><dt>Metric</dt><dd>{label(rule.metricType)}</dd></div><div><dt>Threshold</dt><dd>{label(rule.comparisonOperator)} {rule.thresholdValue}</dd></div><div><dt>Severity</dt><dd><StatusBadge variant={rule.severity}>{rule.severity}</StatusBadge></dd></div><div><dt>Target</dt><dd>{targetLabel(rule)}</dd></div><div><dt>Updated</dt><dd>{formatDate(rule.updatedAt)}</dd></div></dl>{canMutate && <div className="alert-rule-actions"><button type="button" disabled={pendingId === rule.id} onClick={() => openEdit(rule)}>Edit</button><button type="button" disabled={pendingId === rule.id} onClick={() => toggleRule(rule)}>{rule.enabled ? "Disable" : "Enable"}</button><button type="button" disabled={pendingId === rule.id} onClick={() => deleteRule(rule)}>Delete</button></div>}</article>)}</div>
        </>}
        {dialogRule && <div className="alert-rule-dialog-backdrop" role="presentation"><div className="alert-rule-dialog" role="dialog" aria-modal="true" aria-labelledby="alert-rule-dialog-title"><h3 id="alert-rule-dialog-title">{dialogRule === "new" ? "Create alert rule" : "Edit alert rule"}</h3><RuleForm form={form} setForm={setForm} devices={devices} services={services} saving={saving} onSubmit={submit} onCancel={closeDialog} error={formError} /></div></div>}
      </section>
    </DashboardLayout>
  );
}