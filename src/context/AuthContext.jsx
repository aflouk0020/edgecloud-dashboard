import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [role, setRole] = useState(localStorage.getItem("role"));

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

  useEffect(() => {
    setToken(localStorage.getItem("token"));
    setRole(localStorage.getItem("role"));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        role,
        login,
        logout,
        isAuthenticated: Boolean(token)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
