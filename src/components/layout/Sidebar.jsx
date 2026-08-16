import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: "⌂"
  },
  {
    label: "Services",
    path: "/services",
    icon: "◇"
  },
  {
    label: "Device Inventory",
    path: "/devices",
    icon: "▣",
    roles: ["ADMIN", "OPERATOR", "PROJECT_ADMIN"]
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
  const { role } = useAuth();
  const visibleItems = navItems.filter(item => !item.roles || item.roles.includes(role));
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
        {visibleItems.map(item => (
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
