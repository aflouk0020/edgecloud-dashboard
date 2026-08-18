import { useEffect, useState } from "react";

import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import LoadingState from "../../components/ui/LoadingState";
import PageHero from "../../components/ui/PageHero";
import StatusBadge from "../../components/ui/StatusBadge";
import { PrimaryButton } from "../../components/ui/Buttons";
import { getAccessibleProjects, getDeviceGroups, getDeviceInventory, getDeviceTags } from "../../services/deviceService";
import { deactivateDevice, reactivateDevice, removeDevice } from "../../services/deviceService";
import { useAuth } from "../../context/AuthContext";
import DeviceManagementDialog from "./DeviceManagementDialog";
import DeviceConfigurationDialog from "./DeviceConfigurationDialog";
import DeviceOrganisationDialog from "./DeviceOrganisationDialog";
import DeviceHeartbeatDialog from "./DeviceHeartbeatDialog";
import DeviceMaintenanceDialog from "./DeviceMaintenanceDialog";

const PAGE_SIZE = 10;

function formatDate(value) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-IE", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  }).format(new Date(value));
}

function optionalValue(value) {
  return value || "Not recorded";
}

export default function DevicesPage() {
  const { role } = useAuth();
  const [inventory, setInventory] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState("name");
  const [direction, setDirection] = useState("asc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [dialog, setDialog] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [projects, setProjects] = useState([]), [projectId, setProjectId] = useState("");
  const [groups, setGroups] = useState([]), [tags, setTags] = useState([]), [groupId, setGroupId] = useState(""), [tagIds, setTagIds] = useState([]);
  const [heartbeatStatus,setHeartbeatStatus]=useState("");
  const canManage = role === "ADMIN" || role === "OPERATOR" || role === "PROJECT_ADMIN";

  useEffect(() => { getAccessibleProjects().then(items => { const activeProjects = items.filter(project => project.status === "ACTIVE"); setProjects(items); if (role === "PROJECT_ADMIN" && activeProjects.length) setProjectId(activeProjects[0].id); }).catch(() => setProjects([])); }, [role]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (!projectId) { setGroups([]); setTags([]); return; } Promise.all([getDeviceGroups(projectId), getDeviceTags(projectId)]).then(([g, t]) => { setGroups(g); setTags(t); }).catch(() => { setGroups([]); setTags([]); }); }, [projectId, reloadKey]);

  useEffect(() => {
    let active = true;
    /* Inventory inputs are external request parameters; reset request state for each fetch. */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError("");
    getDeviceInventory({ search, page, size: PAGE_SIZE, sort, direction, projectId, groupId, tagIds, heartbeatStatus })
      .then(response => active && setInventory(response))
      .catch(() => active && setError("Unable to load the device inventory. Please try again."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [search, page, sort, direction, projectId, groupId, tagIds, heartbeatStatus, reloadKey]);

  function submitSearch(event) {
    event.preventDefault();
    setPage(0);
    setSearch(searchInput.trim());
  }

  function changeSort(event) {
    setPage(0);
    setSort(event.target.value);
  }

  function changeDirection(event) {
    setPage(0);
    setDirection(event.target.value);
  }

  function saved(message) { setDialog(null); setFeedback(message); setReloadKey(value => value + 1); }
  async function transition(device) {
    try { await (device.active ? deactivateDevice(device.deviceId) : reactivateDevice(device.deviceId)); saved(device.active ? "Device deactivated." : "Device reactivated."); }
    catch (e) { setFeedback(e.message || "Unable to change device lifecycle state."); }
  }
  async function remove(device) {
    if (!window.confirm(`Remove ${device.name}? Lifecycle history will be retained.`)) return;
    try { await removeDevice(device.deviceId); saved("Device removed."); } catch (e) { setFeedback(e.message || "Unable to remove device."); }
  }

  if (loading) {
    return <section className="device-inventory-page"><LoadingState message="Loading device inventory..." /></section>;
  }

  if (error) {
    return (
      <section className="device-inventory-page">
        <ErrorState message={error} action={<PrimaryButton onClick={() => setReloadKey(value => value + 1)}>Retry</PrimaryButton>} />
      </section>
    );
  }

  const devices = inventory?.devices || [];

  return (
    <section className="device-inventory-page">
      <PageHero eyebrow="Device Service" title="Device Inventory" description="Browse registered edge devices and their latest operational and heartbeat state." />
      <div className="device-management-toolbar">{role === "ADMIN" && <PrimaryButton onClick={() => setDialog({ mode: "new" })}>Register Device</PrimaryButton>}{canManage && projectId && <PrimaryButton onClick={() => setDialog({ mode: "organisation" })}>Manage groups and tags</PrimaryButton>}{feedback && <p role="status">{feedback}</p>}</div>

      <form className="device-inventory-controls" onSubmit={submitSearch}>
        <label><span>Search by device name or ID</span><input type="search" value={searchInput} placeholder="Search devices..." onChange={event => setSearchInput(event.target.value)} /></label>
        <PrimaryButton type="submit">Search</PrimaryButton>
        <label><span>Project</span><select aria-label="Project" value={projectId} onChange={event => { setPage(0); setProjectId(event.target.value); setGroupId(""); setTagIds([]); }}><option value="">All accessible devices</option>{projects.map(project => <option key={project.id} value={project.id} disabled={project.status !== "ACTIVE"}>{project.name}{project.status !== "ACTIVE" ? " (Archived)" : ""}</option>)}</select></label>
        <label><span>Group</span><select aria-label="Group filter" disabled={!projectId} value={groupId} onChange={event => { setPage(0); setGroupId(event.target.value); }}><option value="">All groups</option>{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
        <fieldset className="device-tag-filter" disabled={!projectId}><legend>Tags (match all)</legend>{tags.map(tag => <label key={tag.id}><input type="checkbox" checked={tagIds.includes(tag.id)} onChange={event => { setPage(0); setTagIds(ids => event.target.checked ? [...ids, tag.id] : ids.filter(id => id !== tag.id)); }} />{tag.name}</label>)}</fieldset>
        <label><span>Heartbeat</span><select aria-label="Heartbeat status filter" value={heartbeatStatus} onChange={event=>{setPage(0);setHeartbeatStatus(event.target.value)}}><option value="">All heartbeat states</option>{["ONLINE","HEALTHY","DELAYED","OFFLINE","UNKNOWN"].map(value=><option key={value}>{value}</option>)}</select></label>
        {(groupId || tagIds.length > 0 || heartbeatStatus) && <button type="button" onClick={() => { setGroupId(""); setTagIds([]); setHeartbeatStatus(""); setPage(0); }}>Clear filters</button>}
        <label><span>Sort by</span><select aria-label="Sort by" value={sort} onChange={changeSort}><option value="name">Name</option><option value="status">Status</option><option value="lastSeen">Last seen</option><option value="registrationDate">Registration date</option></select></label>
        <label><span>Direction</span><select aria-label="Sort direction" value={direction} onChange={changeDirection}><option value="asc">Ascending</option><option value="desc">Descending</option></select></label>
      </form>

      {devices.length === 0 ? (
        <EmptyState title={search ? "No Matching Devices" : "No Registered Devices"} message={search ? "No device name or ID matched the search." : "No edge devices are currently registered."} />
      ) : (
        <>
          <p className="device-inventory-summary">Showing {page * PAGE_SIZE + 1}–{page * PAGE_SIZE + devices.length} of {inventory.totalElements} devices</p>
          <div className="device-inventory-table-wrap">
            <table className="device-inventory-table">
              <thead><tr><th>Device</th><th>Type</th><th>Status</th><th>Heartbeat</th><th>Firmware</th><th>Project</th><th>Registration</th><th>Last communication</th><th>Groups</th><th>Tags</th><th>Location</th><th>Actions</th></tr></thead>
              <tbody>{devices.map(device => (
                <tr key={device.deviceId} className={device.operationalStatus?.toLowerCase()}>
                  <td><strong>{device.name}</strong><small>{device.deviceId}</small></td><td>{device.type}</td>
                  <td><StatusBadge variant={device.operationalStatus}>{device.operationalStatus}</StatusBadge>{device.maintenanceMode && <><StatusBadge variant="MAINTENANCE">MAINTENANCE</StatusBadge><small>{device.maintenanceReason || "No reason supplied"}</small></>}</td>
                  <td><StatusBadge variant={device.heartbeatStatus}>{device.heartbeatStatus.replaceAll("_", " ")}</StatusBadge><small>{formatDate(device.latestHeartbeat)} · next {formatDate(device.nextExpectedHeartbeat)}</small><small>{device.consecutiveMissedHeartbeats} missed</small></td>
                  <td>{optionalValue(device.firmwareVersion)}</td><td>{optionalValue(device.assignedProject)}</td>
                  <td>{formatDate(device.registrationDate)}</td><td>{formatDate(device.lastSeen)}</td><td>{device.groups?.length ? device.groups.map(group => group.name).join(", ") : "None"}</td>
                  <td>{device.tags?.length ? device.tags.join(", ") : "None"}</td><td>{optionalValue(device.location)}</td>
                  <td className="device-row-actions"><button onClick={() => setDialog({ mode: "maintenance", device })}>Maintenance</button><button onClick={() => setDialog({ mode: "heartbeat", device })}>Heartbeat</button><button onClick={() => setDialog({ mode: "configuration", device })}>Configuration</button><button onClick={() => setDialog({ mode: "history", device })}>History</button>{canManage && <><button onClick={() => setDialog({ mode: "edit", device })}>Edit</button><button onClick={() => transition(device)}>{device.active ? "Deactivate" : "Reactivate"}</button></>}{role === "ADMIN" && !device.active && <button onClick={() => remove(device)}>Remove</button>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="device-inventory-cards">{devices.map(device => (
            <article key={device.deviceId} className={`device-inventory-card ${device.operationalStatus?.toLowerCase()}`}>
              <header><div><strong>{device.name}</strong><small>{device.deviceId}</small></div><StatusBadge variant={device.operationalStatus}>{device.operationalStatus}</StatusBadge></header>
              <dl><div><dt>Type</dt><dd>{device.type}</dd></div><div><dt>Lifecycle</dt><dd>{device.active ? "Active" : "Inactive"}</dd></div><div><dt>Maintenance</dt><dd>{device.maintenanceMode ? <><StatusBadge variant="MAINTENANCE">MAINTENANCE</StatusBadge> {device.maintenanceReason || "No reason supplied"}</> : "Not in maintenance"}</dd></div><div><dt>Heartbeat</dt><dd>{device.heartbeatStatus.replaceAll("_", " ")} · {formatDate(device.latestHeartbeat)}</dd></div><div><dt>Firmware</dt><dd>{optionalValue(device.firmwareVersion)}</dd></div><div><dt>Project</dt><dd>{optionalValue(device.assignedProject)}</dd></div><div><dt>Registered</dt><dd>{formatDate(device.registrationDate)}</dd></div><div><dt>Last communication</dt><dd>{formatDate(device.lastSeen)}</dd></div><div><dt>Groups</dt><dd>{device.groups?.length ? device.groups.map(group => group.name).join(", ") : "None"}</dd></div><div><dt>Tags</dt><dd>{device.tags?.length ? device.tags.join(", ") : "None"}</dd></div><div><dt>Location</dt><dd>{optionalValue(device.location)}</dd></div></dl>
              <footer className="device-row-actions"><button onClick={() => setDialog({ mode: "maintenance", device })}>Maintenance</button><button onClick={() => setDialog({ mode: "heartbeat", device })}>Heartbeat</button><button onClick={() => setDialog({ mode: "configuration", device })}>Configuration</button><button onClick={() => setDialog({ mode: "history", device })}>History</button>{canManage && <><button onClick={() => setDialog({ mode: "edit", device })}>Edit</button><button onClick={() => transition(device)}>{device.active ? "Deactivate" : "Reactivate"}</button></>}{role === "ADMIN" && !device.active && <button onClick={() => remove(device)}>Remove</button>}</footer>
            </article>
          ))}</div>
        </>
      )}

      {(inventory?.totalPages || 0) > 1 && (
        <nav className="device-inventory-pagination" aria-label="Device inventory pagination"><button type="button" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {page + 1} of {inventory.totalPages}</span><button type="button" disabled={page + 1 >= inventory.totalPages} onClick={() => setPage(value => value + 1)}>Next</button></nav>
      )}
      {dialog?.mode === "maintenance" ? <DeviceMaintenanceDialog device={dialog.device} projectId={projectId} role={role} onClose={() => setDialog(null)} onChanged={() => setReloadKey(value => value + 1)} /> : dialog?.mode === "heartbeat" ? <DeviceHeartbeatDialog device={dialog.device} projectId={projectId} onClose={() => setDialog(null)} /> : dialog?.mode === "configuration" ? <DeviceConfigurationDialog device={dialog.device} role={role} onClose={() => setDialog(null)} /> : dialog?.mode === "organisation" ? <DeviceOrganisationDialog projectId={projectId} devices={devices} onClose={() => setDialog(null)} onChanged={() => setReloadKey(value => value + 1)} /> : dialog && <DeviceManagementDialog {...dialog} onClose={() => setDialog(null)} onSaved={saved} />}
    </section>
  );
}
