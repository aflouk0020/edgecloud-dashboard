import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(
    localStorage.getItem("token")
  );

  const [role, setRole] = useState(
    localStorage.getItem("role")
  );

  const login = (jwtToken, userRole) => {
    localStorage.setItem("token", jwtToken);
    localStorage.setItem("role", userRole);

    setToken(jwtToken);
    setRole(userRole);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");

    setToken(null);
    setRole(null);
  };

  useEffect(() => {
    const storedToken =
      localStorage.getItem("token");

    const storedRole =
      localStorage.getItem("role");

    if (storedToken) {
      setToken(storedToken);
      setRole(storedRole);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        role,
        login,
        logout,
        isAuthenticated: !!token
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
