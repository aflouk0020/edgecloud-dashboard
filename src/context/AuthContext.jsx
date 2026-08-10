import { createContext, useContext, useMemo, useState } from "react";

const AuthContext = createContext();

function readUserId(token) {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const claims = JSON.parse(atob(payload.replaceAll("-", "+").replaceAll("_", "/")));
    return claims.userId ?? claims.user_id ?? claims.sub ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [role, setRole] = useState(localStorage.getItem("role"));
  const userId = useMemo(() => readUserId(token), [token]);

  function login(jwtToken, userRole) {
    localStorage.setItem("token", jwtToken);
    localStorage.setItem("role", userRole);
    setToken(jwtToken);
    setRole(userRole);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setToken(null);
    setRole(null);
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        role,
        userId,
        login,
        logout,
        isAuthenticated: Boolean(token)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
