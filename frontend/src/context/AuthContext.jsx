import React, { createContext, useState, useEffect, useContext } from "react";
import authService from "../services/authService";
import api from "../services/api";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    const token = authService.getToken();

    if (!currentUser || !token) {
      setUser(currentUser);
      setLoading(false);
      return;
    }

    setUser(currentUser);

    // Refresh user data from DB to catch any updates (e.g. student_type changes)
    api
      .get("/auth/me")
      .then((res) => {
        if (res.data?.success && res.data.user) {
          const freshUser = res.data.user;
          setUser(freshUser);
          localStorage.setItem("user", JSON.stringify(freshUser));
        }
      })
      .catch((err) => {
        console.error("Failed to refresh user session:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = async (email, password) => {
    const response = await authService.login(email, password);
    setUser(response.user);
    return response;
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
