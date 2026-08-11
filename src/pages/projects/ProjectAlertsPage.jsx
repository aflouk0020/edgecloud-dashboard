import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import DashboardLayout from "../../components/layout/DashboardLayout";
import ProjectContextNav from "../../components/projects/ProjectContextNav";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import LoadingState from "../../components/ui/LoadingState";
import PageHero from "../../components/ui/PageHero";
import StatusBadge from "../../components/ui/StatusBadge";
import EscalationPolicyPanel from "../../components/alerts/EscalationPolicyPanel";
import { getAlertEscalationHistory } from "../../services/escalationPolicyService";
import { useAuth } from "../../context/AuthContext";
import { getProjectWorkspace, normalizeWorkspaceError } from "../../services/projectWorkspaceService";
import {
  acknowledgeAlert,
  getAlertOwnershipHistory,
  getProjectAlert,
  listProjectAlerts,
  normalizeProjectAlertEventError,
  releaseAlertOwnership
} from "../../services/projectAlertEventService";

const DEFAULT_FILTERS = { status: "", severity: "", sourceType: "", sourceId: "", ownerId: "", from: "", to: "", sortDirection: "DESC" };
const PAGE_SIZES = [10, 20, 50, 100];
const MUTATION_ROLES = new Set(["ADMIN", "PROJECT_ADMIN", "OPERATOR"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function label(value) {
  return String(value || "Unavailable").replaceAll("_", " ");
}

function formatDate(value, empty = "Unavailable") {
  if (!value) return empty;
  return new Intl.DateTimeFormat("en-IE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusText(status) {
  if (status === "OPEN") return "● OPEN";
  if (status === "ACKNOWLEDGED") return "◆ ACKNOWLEDGED";
  return "✓ RESOLVED";
}

function severityText(severity) {
  return `${severity === "HIGH" ? "▲" : severity === "MEDIUM" ? "◆" : "●"} ${severity}`;
}

function ownerText(alert) {
  if (!alert?.ownerUserId) return "Unassigned";
  return alert.ownerDisplayName || `User ${alert.ownerUserId}`;
}

function Evidence({ alert }) {
  return (
    <dl className="project-alert-evidence">
      <div><dt>Metric</dt><dd>{label(alert.metricType)}</dd></div>
      <div><dt>Observed</dt><dd>{alert.observedValue ?? "Unavailable"}</dd></div>
      <div><dt>Threshold</dt><dd>{label(alert.comparisonOperator)} {alert.thresholdValue ?? "Unavailable"}</dd></div>
      <div><dt>Source</dt><dd>{label(alert.sourceType)} · {alert.sourceId || "Unavailable"}</dd></div>
      <div><dt>Triggered</dt><dd>{formatDate(alert.triggeredAt)}</dd></div>
      <div><dt>Last observed</dt><dd>{formatDate(alert.lastObservedAt)}</dd></div>
      <div><dt>Owner</dt><dd>{ownerText(alert)}</dd></div>
      {alert.acknowledgedAt && <div><dt>Acknowledged</dt><dd>{formatDate(alert.acknowledgedAt)}</dd></div>}
    </dl>
  );
}

function AlertBadges({ alert }) {
  return <div className="project-alert-badges"><StatusBadge variant={alert.status}>{statusText(alert.status)}</StatusBadge><StatusBadge variant={alert.severity}>{severityText(alert.severity)}</StatusBadge></div>;
}

function OwnershipHistory({ state }) {
  return <section className="project-alert-ownership-history" aria-labelledby="ownership-history-title">
    <h4 id="ownership-history-title">Ownership History</h4>
    {state.loading && <LoadingState message="Loading ownership history..." />}
    {state.error && <div className="project-alert-inline-error" role="status">Ownership history is temporarily unavailable.</div>}
    {!state.loading && !state.error && state.entries.length === 0 && <p>No ownership changes recorded.</p>}
    {!state.loading && !state.error && state.entries.length > 0 && <ol>{state.entries.map(entry => <li key={entry.id}><strong>{label(entry.action)}</strong><span>Actor: {entry.actorUserId}</span><span>Owner: {entry.ownerDisplayName || (entry.ownerUserId ? `User ${entry.ownerUserId}` : "Unassigned")}</span><time dateTime={entry.changedAt}>{formatDate(entry.changedAt)}</time></li>)}</ol>}
  </section>;
}

function AlertDetail({ alert, loading, error, history, escalationHistory, canMutate, userId, pending, feedback, onClose, onAcknowledge, onRelease }) {
  const canAcknowledge = canMutate && alert?.status === "OPEN";
  const canRelease = canMutate && alert?.status === "ACKNOWLEDGED" && userId && userId === alert.ownerUserId;
  return (
    <div className="project-alert-detail-backdrop" role="presentation">
      <aside className="project-alert-detail" role="dialog" aria-modal="true" aria-labelledby="project-alert-detail-title">
        <header><div><p className="eyebrow">Lifecycle evidence</p><h3 id="project-alert-detail-title">Alert detail</h3></div><button type="button" onClick={onClose} aria-label="Close alert detail">×</button></header>
        {loading && <LoadingState message="Loading alert detail..." />}
        {error && <ErrorState title={error.title} message={error.message} />}
        {alert && <>
          <AlertBadges alert={alert} />
          <h4>{alert.alertRuleName || "Unnamed alert rule"}</h4>
          {feedback && <div className={`project-alert-feedback ${feedback.type}`} role="status">{feedback.message}</div>}
          {(canAcknowledge || canRelease) && <div className="project-alert-actions">
            {canAcknowledge && <button type="button" disabled={pending} onClick={onAcknowledge}>{pending ? "Acknowledging..." : "Acknowledge"}</button>}
            {canRelease && <button type="button" disabled={pending} onClick={onRelease}>{pending ? "Releasing..." : "Release Ownership"}</button>}
          </div>}
          <dl className="project-alert-detail-grid">
            <div><dt>Alert ID</dt><dd>{alert.id}</dd></div><div><dt>Rule ID</dt><dd>{alert.alertRuleId}</dd></div>
            <div><dt>Rule name</dt><dd>{alert.alertRuleName}</dd></div><div><dt>Project</dt><dd>{alert.projectId}</dd></div>
            <div><dt>Source type</dt><dd>{label(alert.sourceType)}</dd></div><div><dt>Source ID</dt><dd>{alert.sourceId}</dd></div>
            <div><dt>Metric</dt><dd>{label(alert.metricType)}</dd></div><div><dt>Observed value</dt><dd>{alert.observedValue}</dd></div>
            <div><dt>Threshold value</dt><dd>{alert.thresholdValue}</dd></div><div><dt>Operator</dt><dd>{label(alert.comparisonOperator)}</dd></div>
            <div><dt>Severity</dt><dd>{alert.severity}</dd></div><div><dt>Status</dt><dd>{alert.status}</dd></div>
            <div><dt>Owner user ID</dt><dd>{alert.ownerUserId || "Unassigned"}</dd></div><div><dt>Owner label</dt><dd>{ownerText(alert)}</dd></div>
            <div><dt>Acknowledged at</dt><dd>{formatDate(alert.acknowledgedAt)}</dd></div><div><dt>Last ownership change</dt><dd>{formatDate(alert.ownershipChangedAt)}</dd></div>
            <div><dt>Triggered</dt><dd>{formatDate(alert.triggeredAt)}</dd></div><div><dt>Last observed</dt><dd>{formatDate(alert.lastObservedAt)}</dd></div>
            <div><dt>Resolved</dt><dd>{formatDate(alert.resolvedAt, "Not resolved")}</dd></div><div><dt>Created</dt><dd>{formatDate(alert.createdAt)}</dd></div>
            <div><dt>Updated</dt><dd>{formatDate(alert.updatedAt)}</dd></div>
            <div><dt>Escalation level</dt><dd>{alert.escalationLevel || "Not escalated"}</dd></div><div><dt>Last escalated</dt><dd>{formatDate(alert.escalatedAt,"Not escalated")}</dd></div>
          </dl>
          <OwnershipHistory state={history} />
          <section className="project-alert-ownership-history"><h4>Escalation timeline</h4>{escalationHistory?.loading&&<LoadingState message="Loading escalation history..."/>}{!escalationHistory?.loading&&!(escalationHistory?.entries?.length)&&<p>No escalations recorded.</p>}{escalationHistory?.entries?.length>0&&<ol>{escalationHistory.entries.map(e=><li key={e.id}><strong>Level {e.levelNumber} · {label(e.reason)}</strong><span>{e.previousSeverity} → {e.resultingSeverity}</span><time dateTime={e.escalatedAt}>{formatDate(e.escalatedAt)}</time></li>)}</ol>}</section>
        </>}
      </aside>
    </div>
  );
}

export default function ProjectAlertsPage() {
  const { projectId } = useParams();
  const { role, userId } = useAuth();
  const [workspace, setWorkspace] = useState(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [workspaceError, setWorkspaceError] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [result, setResult] = useState(null);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const [detailState, setDetailState] = useState(null);
  const ownerIdError = filters.ownerId && !UUID_PATTERN.test(filters.ownerId) ? "Enter a valid owner UUID." : "";
  const canMutate = MUTATION_ROLES.has(role) && workspace?.projectStatus !== "ARCHIVED";

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (!active) return null; setWorkspaceLoading(true); setWorkspace(null); setWorkspaceError(null); setResult(null); return getProjectWorkspace(projectId); })
      .then(value => { if (active) setWorkspace(value); })
      .catch(error => { if (active) setWorkspaceError(normalizeWorkspaceError(error)); })
      .finally(() => { if (active) setWorkspaceLoading(false); });
    return () => { active = false; };
  }, [projectId]);

  const requestFilters = useMemo(() => ({
    ...filters,
    ownerId: filters.ownerId && UUID_PATTERN.test(filters.ownerId) ? filters.ownerId : "",
    from: filters.from ? new Date(filters.from).toISOString() : "",
    to: filters.to ? new Date(filters.to).toISOString() : "",
    page, size
  }), [filters, page, size]);

  useEffect(() => {
    if (!workspace || ownerIdError) return undefined;
    let active = true;
    Promise.resolve().then(() => { if (!active) return null; setListLoading(true); setListError(null); return listProjectAlerts(projectId, requestFilters); })
      .then(value => { if (active) setResult(value); })
      .catch(error => { if (active) setListError(normalizeProjectAlertEventError(error)); })
      .finally(() => { if (active) setListLoading(false); });
    return () => { active = false; };
  }, [ownerIdError, projectId, requestFilters, retryKey, workspace]);

  const hasFilters = Object.entries(filters).some(([key, value]) => key !== "sortDirection" && Boolean(value));
  const alerts = result?.alerts || [];

  function updateFilter(key, value) { setFilters(current => ({ ...current, [key]: value })); setPage(0); }
  function clearFilters() { setFilters(DEFAULT_FILTERS); setPage(0); }

  function loadDetail(alertId) {
    setDetailState({ loading: true, alert: null, error: null, history: { loading: true, entries: [], error: null }, escalationHistory:{loading:true,entries:[]}, pending: false, feedback: null });
    getProjectAlert(projectId, alertId)
      .then(alert => setDetailState(current => ({ ...current, loading: false, alert })))
      .catch(error => setDetailState(current => ({ ...current, loading: false, error: normalizeProjectAlertEventError(error), history: { loading: false, entries: [], error: null } })));
    getAlertOwnershipHistory(projectId, alertId)
      .then(entries => setDetailState(current => current ? ({ ...current, history: { loading: false, entries, error: null } }) : current))
      .catch(() => setDetailState(current => current ? ({ ...current, history: { loading: false, entries: [], error: true } }) : current));
    getAlertEscalationHistory(projectId,alertId).then(entries=>setDetailState(current=>current?({...current,escalationHistory:{loading:false,entries}}):current)).catch(()=>setDetailState(current=>current?({...current,escalationHistory:{loading:false,entries:[]}}):current));
  }

  async function mutateOwnership(operation, successMessage) {
    const alertId = detailState.alert.id;
    setDetailState(current => ({ ...current, pending: true, feedback: null }));
    try {
      const updated = await operation(projectId, alertId);
      setDetailState(current => ({ ...current, alert: updated, pending: false, feedback: { type: "success", message: successMessage } }));
      setRetryKey(value => value + 1);
      getAlertOwnershipHistory(projectId, alertId)
        .then(entries => setDetailState(current => current ? ({ ...current, history: { loading: false, entries, error: null } }) : current))
        .catch(() => setDetailState(current => current ? ({ ...current, history: { loading: false, entries: [], error: true } }) : current));
    } catch (error) {
      const normalized = normalizeProjectAlertEventError(error);
      setDetailState(current => ({ ...current, pending: false, feedback: { type: "error", message: normalized.message } }));
      if ([403, 409].includes(normalized.status)) {
        getProjectAlert(projectId, alertId).then(alert => setDetailState(current => current ? ({ ...current, alert }) : current)).catch(() => {});
        setRetryKey(value => value + 1);
      }
    }
  }

  if (workspaceLoading) return <DashboardLayout><section className="project-alerts-page"><LoadingState message="Loading project workspace..." /></section></DashboardLayout>;
  if (workspaceError) return <DashboardLayout><section className="project-alerts-page"><ErrorState title={workspaceError.title} message={workspaceError.message} /></section></DashboardLayout>;

  return <DashboardLayout><section className="project-alerts-page">
    <ProjectContextNav active="alerts" />
    <PageHero eyebrow={workspace.projectName || "Project"} title="Alert History" description="Operational evidence and ownership for triggered and resolved project alerts." />
    <EscalationPolicyPanel projectId={projectId} canManage={role==="ADMIN"||workspace.callerProjectRole==="PROJECT_ADMIN"}/>
    {workspace.projectStatus === "ARCHIVED" && <div className="project-alert-archive" role="status"><strong>Archived project</strong><span>Historical alerts are read-only.</span></div>}
    <form className="project-alert-filters" onSubmit={event => event.preventDefault()}>
      <label>Status<select aria-label="Alert status" value={filters.status} onChange={event => updateFilter("status", event.target.value)}><option value="">All statuses</option><option value="OPEN">OPEN</option><option value="ACKNOWLEDGED">ACKNOWLEDGED</option><option value="RESOLVED">RESOLVED</option></select></label>
      <label>Severity<select aria-label="Alert severity" value={filters.severity} onChange={event => updateFilter("severity", event.target.value)}><option value="">All severities</option><option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option></select></label>
      <label>Source type<select aria-label="Alert source type" value={filters.sourceType} onChange={event => updateFilter("sourceType", event.target.value)}><option value="">All source types</option><option value="DEVICE">DEVICE</option><option value="SERVICE">SERVICE</option></select></label>
      <label>Source ID<input aria-label="Alert source ID" value={filters.sourceId} onChange={event => updateFilter("sourceId", event.target.value)} placeholder="Exact source ID" /></label>
      <label>Owner ID<input aria-label="Alert owner ID" aria-invalid={Boolean(ownerIdError)} aria-describedby={ownerIdError ? "owner-id-error" : undefined} value={filters.ownerId} onChange={event => updateFilter("ownerId", event.target.value.trim())} placeholder="Exact owner UUID" />{ownerIdError && <small id="owner-id-error" role="alert">{ownerIdError}</small>}</label>
      <label>From<input aria-label="Alert from" type="datetime-local" value={filters.from} onChange={event => updateFilter("from", event.target.value)} /></label>
      <label>To<input aria-label="Alert to" type="datetime-local" value={filters.to} onChange={event => updateFilter("to", event.target.value)} /></label>
      <label>Page size<select aria-label="Alert page size" value={size} onChange={event => { setSize(Number(event.target.value)); setPage(0); }}>{PAGE_SIZES.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      <button type="button" onClick={clearFilters} disabled={!hasFilters}>Clear filters</button>
    </form>
    {listError && <ErrorState title={listError.title} message={listError.message} action={<button type="button" onClick={() => setRetryKey(value => value + 1)}>Retry</button>} />}
    {!listError && !result && listLoading && <LoadingState message="Loading project alerts..." />}
    {!listError && result && <>
      <div className="project-alert-results-summary" aria-live="polite"><strong>{result.totalElements} total {result.totalElements === 1 ? "alert" : "alerts"}</strong>{listLoading && <span>Updating results...</span>}<span>Triggered newest first</span></div>
      {!listLoading && alerts.length === 0 && <EmptyState title={hasFilters ? "No matching project alerts" : "No project alert history"} message={hasFilters ? "Clear or adjust the active filters." : "Triggered alert events will appear here."} action={hasFilters ? <button type="button" onClick={clearFilters}>Clear filters</button> : null} />}
      {alerts.length > 0 && <><div className="project-alert-table-wrap"><table className="project-alert-table"><thead><tr><th>Alert</th><th>State</th><th>Evidence</th><th>Source</th><th>Owner</th><th>Lifecycle</th><th><span className="sr-only">Action</span></th></tr></thead><tbody>{alerts.map(alert => <tr key={alert.id} className={String(alert.status).toLowerCase()}><td><strong>{alert.alertRuleName}</strong><small>{label(alert.metricType)}</small></td><td><AlertBadges alert={alert} /></td><td><strong>{alert.observedValue}</strong><small>{label(alert.comparisonOperator)} {alert.thresholdValue}</small></td><td><strong>{label(alert.sourceType)}</strong><small>{alert.sourceId}</small></td><td><strong>{ownerText(alert)}</strong>{alert.acknowledgedAt && <small>{formatDate(alert.acknowledgedAt)}</small>}</td><td><strong>{formatDate(alert.triggeredAt)}</strong><small>Last: {formatDate(alert.lastObservedAt)}</small></td><td><button type="button" onClick={() => loadDetail(alert.id)}>View details</button></td></tr>)}</tbody></table></div>
        <div className="project-alert-card-list" aria-label="Project alert cards">{alerts.map(alert => <article className={`project-alert-card ${String(alert.status).toLowerCase()}`} key={alert.id}><header><div><strong>{alert.alertRuleName}</strong><span>{label(alert.metricType)}</span></div><AlertBadges alert={alert} /></header><Evidence alert={alert} /><button type="button" onClick={() => loadDetail(alert.id)}>View details</button></article>)}</div></>}
      <nav className="project-alert-pagination" aria-label="Alert pagination"><button type="button" disabled={page <= 0 || listLoading} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {result.totalPages === 0 ? 0 : page + 1} of {result.totalPages} · {result.totalElements} results</span><button type="button" disabled={page + 1 >= result.totalPages || listLoading} onClick={() => setPage(value => value + 1)}>Next</button></nav>
    </>}
    {detailState && <AlertDetail {...detailState} canMutate={canMutate} userId={userId} onClose={() => setDetailState(null)} onAcknowledge={() => mutateOwnership(acknowledgeAlert, "Alert acknowledged successfully.")} onRelease={() => mutateOwnership(releaseAlertOwnership, "Alert ownership released successfully.")} />}
  </section></DashboardLayout>;
}
