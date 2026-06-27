import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function Header() {
  const navigate = useNavigate();
  const { logout, role } = useAuth();

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  function handleRefresh() {
    window.location.reload();
  }

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="header-title">
          <h1>EdgeCloud Monitor</h1>
          <p>Cloud Native Monitoring Platform</p>
        </div>

        <div className="platform-health">
          <span className="health-dot"></span>
          <span>Platform Healthy</span>
        </div>
      </div>

      <div className="header-right">
        <div className="header-info">
          <span className="header-label">Role</span>
          <strong>{role || "ADMIN"}</strong>
        </div>

        <div className="header-info">
          <span className="header-label">Last Updated</span>
          <strong>
            {currentTime.toLocaleTimeString("en-IE")}
          </strong>
        </div>

        <button
          className="secondary-action"
          onClick={handleRefresh}
        >
          Refresh
        </button>

        <button
          className="primary-action"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </header>
  );
}

export default Header;
