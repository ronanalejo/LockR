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

  googleLogin: async (credential) => {
    try {
      const response = await api.post("/auth/google", {
        credential,
      });

      const data = response.data;

      // Don't store token if registration is needed
      if (data.needsRegistration) {
        return data;
      }

      if (data.success && data.token) {
        tokenStorage.setToken(data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      return data;
    } catch (error) {
      console.error("Google login error:", error);
      const message =
        error.response?.data?.message || error.message || "Google login failed";
      throw new Error(message);
    }
  },

  completeRegistration: async (
    email,
    password,
    confirmPassword,
    firstName,
    lastName,
  ) => {
    try {
      const response = await api.post("/auth/complete-registration", {
        email,
        password,
        confirmPassword,
        firstName,
        lastName,
      });

      const data = response.data;

      if (data.success && data.token) {
        tokenStorage.setToken(data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      return data;
    } catch (error) {
      console.error("Registration error:", error);
      const message =
        error.response?.data?.message || error.message || "Registration failed";
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
