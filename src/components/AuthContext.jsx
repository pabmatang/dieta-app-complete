import React, { createContext, useState, useContext, useEffect } from "react";

// Crear el contexto
const AuthContext = createContext();

// Componente proveedor que envuelve la aplicación y gestiona el estado global
export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [userInfoCompleted, setUserInfoCompleted] = useState(false);

  const handleLogin = (newToken) => {
    setToken(newToken);
    localStorage.setItem("token", newToken);
  };

  const handleLogout = () => {
    setToken(null);
    setUserInfoCompleted(false);
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{ token, handleLogin, handleLogout, userInfoCompleted, setUserInfoCompleted }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom Hook para acceder al contexto
export const useAuth = () => useContext(AuthContext);
