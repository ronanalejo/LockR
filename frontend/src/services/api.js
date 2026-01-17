import axios from "axios";
import tokenStorage from "../utils/tokenStorage";

// base configuration with axios
const api = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
  adapter: "xhr",
});

// request interceptor - inject token into every request
api.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getToken();

    // if exists, add it to authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// response interceptor - handle token expiration and errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // handle 401 unauthorized - token expired or invalid
    if (error.response && error.response.status === 401) {
      tokenStorage.removeToken();
      localStorage.removeItem("user");

      // Redirect to login page
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }

      console.error("Authentication failed. Please login again.");
    }

    return Promise.reject(error);
  }
);

export default api;
