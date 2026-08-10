import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import DashboardLayout from "../../components/layout/DashboardLayout";
import ProjectContextNav from "../../components/projects/ProjectContextNav";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import LoadingState from "../../components/ui/LoadingState";
import PageHero from "../../components/ui/PageHero";
import StatusBadge from "../../components/ui/StatusBadge";
import { getProjectWorkspace, normalizeWorkspaceError } from "../../services/projectWorkspaceService";
import {
  getProjectAlert,
  listProjectAlerts,
  normalizeProjectAlertEventError
} from "../../services/projectAlertEventService";

const DEFAULT_FILTERS = { status: "", severity: "", sourceType: "", sourceId: "", from: "", to: "", sortDirection: "DESC" };
const PAGE_SIZES = [10, 20, 50, 100];

function label(value) {
  return String(value || "Unavailable").replaceAll("_", " ");
}

function formatDate(value) {
  if (!value) return "Not resolved";
  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function statusText(status) {
  return status === "OPEN" ? "● OPEN" : "✓ RESOLVED";
}

function severityText(severity) {
  return `${severity === "HIGH" ? "▲" : severity === "MEDIUM" ? "◆" : "●"} ${severity}`;
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
    </dl>
  );
}

function AlertBadges({ alert }) {
  return <div className="project-alert-badges"><StatusBadge variant={alert.status}>{statusText(alert.status)}</StatusBadge><StatusBadge variant={alert.severity}>{severityText(alert.severity)}</StatusBadge></div>;
}

function AlertDetail({ alert, loading, error, onClose }) {
  return (
    <div className="project-alert-detail-backdrop" role="presentation">
      <aside className="project-alert-detail" role="dialog" aria-modal="true" aria-labelledby="project-alert-detail-title">
        <header><div><p className="eyebrow">Lifecycle evidence</p><h3 id="project-alert-detail-title">Alert detail</h3></div><button type="button" onClick={onClose} aria-label="Close alert detail">×</button></header>
        {loading && <LoadingState message="Loading alert detail..." />}
        {error && <ErrorState title={error.title} message={error.message} />}
        {alert && <>
          <AlertBadges alert={alert} />
          <h4>{alert.alertRuleName || "Unnamed alert rule"}</h4>
          <dl className="project-alert-detail-grid">
            <div><dt>Alert ID</dt><dd>{alert.id}</dd></div><div><dt>Rule ID</dt><dd>{alert.alertRuleId}</dd></div>
            <div><dt>Rule name</dt><dd>{alert.alertRuleName}</dd></div><div><dt>Project</dt><dd>{alert.projectId}</dd></div>
            <div><dt>Source type</dt><dd>{label(alert.sourceType)}</dd></div><div><dt>Source ID</dt><dd>{alert.sourceId}</dd></div>
            <div><dt>Metric</dt><dd>{label(alert.metricType)}</dd></div><div><dt>Observed value</dt><dd>{alert.observedValue}</dd></div>
            <div><dt>Threshold value</dt><dd>{alert.thresholdValue}</dd></div><div><dt>Operator</dt><dd>{label(alert.comparisonOperator)}</dd></div>
            <div><dt>Severity</dt><dd>{alert.severity}</dd></div><div><dt>Status</dt><dd>{alert.status}</dd></div>
            <div><dt>Triggered</dt><dd>{formatDate(alert.triggeredAt)}</dd></div><div><dt>Last observed</dt><dd>{formatDate(alert.lastObservedAt)}</dd></div>
            <div><dt>Resolved</dt><dd>{formatDate(alert.resolvedAt)}</dd></div><div><dt>Created</dt><dd>{formatDate(alert.createdAt)}</dd></div>
            <div><dt>Updated</dt><dd>{formatDate(alert.updatedAt)}</dd></div>
          </dl>
        </>}
      </aside>
    </div>
  );
}

export default function ProjectAlertsPage() {
  const { projectId } = useParams();
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

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return null;
      setWorkspaceLoading(true); setWorkspace(null); setWorkspaceError(null); setResult(null);
      return getProjectWorkspace(projectId);
    })
      .then(value => { if (active) setWorkspace(value); })
      .catch(error => { if (active) setWorkspaceError(normalizeWorkspaceError(error)); })
      .finally(() => { if (active) setWorkspaceLoading(false); });
    return () => { active = false; };
  }, [projectId]);

  const requestFilters = useMemo(() => ({
    ...filters,
    from: filters.from ? new Date(filters.from).toISOString() : "",
    to: filters.to ? new Date(filters.to).toISOString() : "",
    page,
    size
  }), [filters, page, size]);

  useEffect(() => {
    if (!workspace) return undefined;
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return null;
      setListLoading(true); setListError(null);
      return listProjectAlerts(projectId, requestFilters);
    })
      .then(value => { if (active) setResult(value); })
      .catch(error => { if (active) setListError(normalizeProjectAlertEventError(error)); })
      .finally(() => { if (active) setListLoading(false); });
    return () => { active = false; };
  }, [projectId, requestFilters, retryKey, workspace]);

  const hasFilters = Object.entries(filters).some(([key, value]) => key !== "sortDirection" && Boolean(value));
  const alerts = result?.alerts || [];

  function updateFilter(key, value) {
    setFilters(current => ({ ...current, [key]: value }));
    setPage(0);
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
    setPage(0);
  }

  function openDetail(alertId) {
    setDetailState({ loading: true, alert: null, error: null });
    getProjectAlert(projectId, alertId)
      .then(alert => setDetailState({ loading: false, alert, error: null }))
      .catch(error => setDetailState({ loading: false, alert: null, error: normalizeProjectAlertEventError(error) }));
  }

  if (workspaceLoading) return <DashboardLayout><section className="project-alerts-page"><LoadingState message="Loading project workspace..." /></section></DashboardLayout>;
  if (workspaceError) return <DashboardLayout><section className="project-alerts-page"><ErrorState title={workspaceError.title} message={workspaceError.message} /></section></DashboardLayout>;

  return (
    <DashboardLayout>
      <section className="project-alerts-page">
        <ProjectContextNav active="alerts" />
        <PageHero eyebrow={workspace.projectName || "Project"} title="Alert History" description="Read-only operational evidence for triggered and resolved project alerts." />
        {workspace.projectStatus === "ARCHIVED" && <div className="project-alert-archive" role="status"><strong>Archived project</strong><span>Historical alerts are read-only.</span></div>}

        <form className="project-alert-filters" onSubmit={event => event.preventDefault()}>
          <label>Status<select aria-label="Alert status" value={filters.status} onChange={event => updateFilter("status", event.target.value)}><option value="">All statuses</option><option value="OPEN">OPEN</option><option value="RESOLVED">RESOLVED</option></select></label>
          <label>Severity<select aria-label="Alert severity" value={filters.severity} onChange={event => updateFilter("severity", event.target.value)}><option value="">All severities</option><option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option></select></label>
          <label>Source type<select aria-label="Alert source type" value={filters.sourceType} onChange={event => updateFilter("sourceType", event.target.value)}><option value="">All source types</option><option value="DEVICE">DEVICE</option><option value="SERVICE">SERVICE</option></select></label>
          <label>Source ID<input aria-label="Alert source ID" value={filters.sourceId} onChange={event => updateFilter("sourceId", event.target.value)} placeholder="Exact source ID" /></label>
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
          {alerts.length > 0 && <>
            <div className="project-alert-table-wrap"><table className="project-alert-table"><thead><tr><th>Alert</th><th>State</th><th>Evidence</th><th>Source</th><th>Lifecycle</th><th><span className="sr-only">Action</span></th></tr></thead><tbody>{alerts.map(alert => <tr key={alert.id} className={alert.status === "OPEN" ? "open" : "resolved"}><td><strong>{alert.alertRuleName}</strong><small>{label(alert.metricType)}</small></td><td><AlertBadges alert={alert} /></td><td><strong>{alert.observedValue}</strong><small>{label(alert.comparisonOperator)} {alert.thresholdValue}</small></td><td><strong>{label(alert.sourceType)}</strong><small>{alert.sourceId}</small></td><td><strong>{formatDate(alert.triggeredAt)}</strong><small>Last: {formatDate(alert.lastObservedAt)}</small></td><td><button type="button" onClick={() => openDetail(alert.id)}>View details</button></td></tr>)}</tbody></table></div>
            <div className="project-alert-card-list" aria-label="Project alert cards">{alerts.map(alert => <article className={`project-alert-card ${alert.status === "OPEN" ? "open" : "resolved"}`} key={alert.id}><header><div><strong>{alert.alertRuleName}</strong><span>{label(alert.metricType)}</span></div><AlertBadges alert={alert} /></header><Evidence alert={alert} /><button type="button" onClick={() => openDetail(alert.id)}>View details</button></article>)}</div>
          </>}
          <nav className="project-alert-pagination" aria-label="Alert pagination"><button type="button" disabled={page <= 0 || listLoading} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {result.totalPages === 0 ? 0 : page + 1} of {result.totalPages} · {result.totalElements} results</span><button type="button" disabled={page + 1 >= result.totalPages || listLoading} onClick={() => setPage(value => value + 1)}>Next</button></nav>
        </>}
        {detailState && <AlertDetail {...detailState} onClose={() => setDetailState(null)} />}
      </section>
    </DashboardLayout>
  );
}
