import { Link, useParams } from "react-router-dom";

const NAV_ITEMS = [
  { label: "Observability", key: "workspace", route: "workspace" },
  { label: "Services", key: "services", route: "services" },
  { label: "Devices", key: "devices", route: "devices" },
  { label: "Metrics", key: "metrics", route: "metrics" }
];

function ProjectContextNav({ active = "workspace" }) {
  const { projectId } = useParams();

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
            to={`/projects/${projectId}/${item.route}`}
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
