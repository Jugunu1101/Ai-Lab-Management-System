import React, { createContext, useContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import authService from "../services/auth.service";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (storedToken) {
        try {
          const decoded = jwtDecode(storedToken);
          // Check expiration
          if (decoded.exp && decoded.exp * 1000 < Date.now()) {
            logout();
          } else {
            setToken(storedToken);
            if (storedUser) {
              setUser(JSON.parse(storedUser));
            } else {
              setUser(decoded);
            }
          }
        } catch {
          logout();
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (credentials) => {
    const response = await authService.login(credentials);
    const receivedToken = response.data?.token || response.token;
    const receivedUser = response.data?.user || response.user;

    if (receivedToken) {
      localStorage.setItem("token", receivedToken);
      setToken(receivedToken);

      const resolvedUser = receivedUser || jwtDecode(receivedToken);
      localStorage.setItem("user", JSON.stringify(resolvedUser));
      setUser(resolvedUser);
      return resolvedUser;
    }
    throw new Error("Invalid response from login server");
  };

  const register = async (userData) => {
    const response = await authService.register(userData);
    const receivedToken = response.data?.token || response.token;
    const receivedUser = response.data?.user || response.user;

    if (receivedToken) {
      localStorage.setItem("token", receivedToken);
      setToken(receivedToken);

      const resolvedUser = receivedUser || jwtDecode(receivedToken);
      localStorage.setItem("user", JSON.stringify(resolvedUser));
      setUser(resolvedUser);
      return resolvedUser;
    }
    return response;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    role: user?.role,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    register,
    logout,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
