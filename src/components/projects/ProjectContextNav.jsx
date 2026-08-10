import { Link, useLocation, useParams } from "react-router-dom";

const NAV_ITEMS = [
  { label: "Observability", key: "workspace", route: "workspace" },
  { label: "Services", key: "services", route: "services" },
  { label: "Devices", key: "devices", route: "devices" },
  { label: "Metrics", key: "metrics", route: "metrics" },
  { label: "Alert Rules", key: "alert-rules", route: "alert-rules" },
  { label: "Alerts", key: "alerts", route: "alerts" }
];

function ProjectContextNav({ active = "workspace" }) {
  const { projectId } = useParams();
  const location = useLocation();

  return (
    <div className="project-workspace-nav" aria-label="Project workspace navigation">
      {NAV_ITEMS.map(item => {
        if (!item.route) {
          return (
            <span key={item.key} className="project-workspace-nav-item">
              {item.label}
            </span>
          );
        }

        const isActive = item.key === active;

        return (
          <Link
            key={item.key}
            className={`project-workspace-nav-item${isActive ? " active" : ""}`}
            aria-current={isActive ? "page" : undefined}
            to={{
              pathname: `/projects/${projectId}/${item.route}`,
              search: location.search
            }}
          >
            {item.label}
          </Link>
        );
      })}

      <Link className="project-workspace-nav-back" to="/dashboard">
        Back to dashboard
      </Link>
    </div>
  );
}

export default ProjectContextNav;
