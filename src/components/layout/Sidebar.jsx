import { NavLink } from "react-router-dom";

const navItems = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: "⌂"
  },
  {
    label: "Devices",
    path: "/devices",
    icon: "▣"
  },
  {
    label: "Telemetry",
    path: "/telemetry",
    icon: "⌁"
  },
  {
    label: "Alerts",
    path: "/alerts",
    icon: "!"
  }
];

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">EC</div>
        <div>
          <strong>EdgeCloud</strong>
          <span>Monitor Console</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              isActive ? "sidebar-link active" : "sidebar-link"
            }
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span>Cloud Native</span>
        <strong>Operational Dashboard</strong>
      </div>
    </aside>
  );
}

export default Sidebar;
