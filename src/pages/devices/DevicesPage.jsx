import { useEffect, useState } from "react";

import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import LoadingState from "../../components/ui/LoadingState";
import PageHero from "../../components/ui/PageHero";
import StatusBadge from "../../components/ui/StatusBadge";
import { PrimaryButton } from "../../components/ui/Buttons";
import { getDeviceInventory } from "../../services/deviceService";

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
  const [inventory, setInventory] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState("name");
  const [direction, setDirection] = useState("asc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getDeviceInventory({ search, page, size: PAGE_SIZE, sort, direction })
      .then(response => active && setInventory(response))
      .catch(() => active && setError("Unable to load the device inventory. Please try again."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [search, page, sort, direction, reloadKey]);

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

      <form className="device-inventory-controls" onSubmit={submitSearch}>
        <label><span>Search by device name or ID</span><input type="search" value={searchInput} placeholder="Search devices..." onChange={event => setSearchInput(event.target.value)} /></label>
        <PrimaryButton type="submit">Search</PrimaryButton>
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
              <thead><tr><th>Device</th><th>Type</th><th>Status</th><th>Heartbeat</th><th>Firmware</th><th>Project</th><th>Registration</th><th>Last communication</th><th>Tags</th><th>Location</th></tr></thead>
              <tbody>{devices.map(device => (
                <tr key={device.deviceId} className={device.operationalStatus?.toLowerCase()}>
                  <td><strong>{device.name}</strong><small>{device.deviceId}</small></td><td>{device.type}</td>
                  <td><StatusBadge variant={device.operationalStatus}>{device.operationalStatus}</StatusBadge></td>
                  <td><strong>{device.heartbeatStatus.replaceAll("_", " ")}</strong><small>{formatDate(device.latestHeartbeat)}</small></td>
                  <td>{optionalValue(device.firmwareVersion)}</td><td>{optionalValue(device.assignedProject)}</td>
                  <td>{formatDate(device.registrationDate)}</td><td>{formatDate(device.lastSeen)}</td>
                  <td>{device.tags?.length ? device.tags.join(", ") : "None"}</td><td>{optionalValue(device.location)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="device-inventory-cards">{devices.map(device => (
            <article key={device.deviceId} className={`device-inventory-card ${device.operationalStatus?.toLowerCase()}`}>
              <header><div><strong>{device.name}</strong><small>{device.deviceId}</small></div><StatusBadge variant={device.operationalStatus}>{device.operationalStatus}</StatusBadge></header>
              <dl><div><dt>Type</dt><dd>{device.type}</dd></div><div><dt>Heartbeat</dt><dd>{device.heartbeatStatus.replaceAll("_", " ")} · {formatDate(device.latestHeartbeat)}</dd></div><div><dt>Firmware</dt><dd>{optionalValue(device.firmwareVersion)}</dd></div><div><dt>Project</dt><dd>{optionalValue(device.assignedProject)}</dd></div><div><dt>Registered</dt><dd>{formatDate(device.registrationDate)}</dd></div><div><dt>Last communication</dt><dd>{formatDate(device.lastSeen)}</dd></div><div><dt>Tags</dt><dd>{device.tags?.length ? device.tags.join(", ") : "None"}</dd></div><div><dt>Location</dt><dd>{optionalValue(device.location)}</dd></div></dl>
            </article>
          ))}</div>
        </>
      )}

      {(inventory?.totalPages || 0) > 1 && (
        <nav className="device-inventory-pagination" aria-label="Device inventory pagination"><button type="button" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {page + 1} of {inventory.totalPages}</span><button type="button" disabled={page + 1 >= inventory.totalPages} onClick={() => setPage(value => value + 1)}>Next</button></nav>
      )}
    </section>
  );
}
