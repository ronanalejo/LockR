import api from "./api";
import tokenStorage from "../utils/tokenStorage";

const authService = {
  login: async (email, password) => {
    try {
      // Use axios instance instead of fetch
      const response = await api.post("/auth/login", {
        email,
        password,
      });

      const data = response.data;

      if (data.success && data.token) {
        // Use tokenStorage for consistency
        tokenStorage.setToken(data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      return data;
    } catch (error) {
      console.error("Login error:", error);
      // Extract error message from axios error response
      const message =
        error.response?.data?.message || error.message || "Login failed";
      throw new Error(message);
    }
  },

  logout: () => {
    tokenStorage.removeToken();
    localStorage.removeItem("user");
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  },

  getToken: () => {
    return tokenStorage.getToken();
  },

  isAuthenticated: () => {
    return !!tokenStorage.getToken();
  },
};

export default authService;
