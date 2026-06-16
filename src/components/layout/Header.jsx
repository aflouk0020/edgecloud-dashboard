import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function Header() {
  const navigate = useNavigate();

  const { logout, role } =
    useAuth();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header>
      <h1>EdgeCloud Monitor</h1>

      <p>
        Role: {role || "Guest"}
      </p>

      <button onClick={handleLogout}>
        Logout
      </button>
    </header>
  );
}

export default Header;
