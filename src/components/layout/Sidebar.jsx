import { Link } from "react-router-dom";

function Sidebar() {
  return (
    <aside>
      <nav>
        <ul>

          <li>
            <Link to="/dashboard">
              Dashboard
            </Link>
          </li>

          <li>
            <Link to="/services">
              Services
            </Link>
          </li>

          <li>
            <Link to="/devices">
              Devices
            </Link>
          </li>

          <li>
            <Link to="/alerts">
              Alerts
            </Link>
          </li>

        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;
