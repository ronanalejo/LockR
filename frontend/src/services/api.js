import axios from "axios";
import tokenStorage from "../utils/tokenStorage";

/**
 * Get the appropriate API base URL based on environment
 * - Local development: uses localhost backend
 * - Production (lockr.fit): uses api.lockr.fit subdomain
 * - Can be overridden with REACT_APP_API_URL environment variable
 */
const getBaseURL = () => {
  // 1. Allow explicit override via environment variable (if not empty)
  if (
    process.env.REACT_APP_API_URL &&
    process.env.REACT_APP_API_URL.trim() !== ""
  ) {
    console.log(
      "Using API URL from environment:",
      process.env.REACT_APP_API_URL,
    );
    return process.env.REACT_APP_API_URL;
  }

  // 2. Detect if running locally
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "";

  if (isLocalhost) {
    console.log("Local development detected - using localhost backend");
    return "http://localhost:5000/api";
  }

  // 3. Production - use API subdomain
  console.log("Production environment detected - using api.lockr.fit");
  return "https://api.lockr.fit/api";
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
  adapter: "xhr",
});

// Log the base URL for debugging
console.log("API Base URL configured:", api.defaults.baseURL);

// request interceptor - inject token into every request
api.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// response interceptor - handle token expiration and errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      tokenStorage.removeToken();
      localStorage.removeItem("user");

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }

      console.error("Authentication failed. Please login again.");
    }

    return Promise.reject(error);
  },
);

export default api;
