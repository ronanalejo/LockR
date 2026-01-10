const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const API_ENDPOINTS = {
  auth: {
    login: `${API_BASE_URL}/auth/login`,
    logout: `${API_BASE_URL}/auth/logout`,
    refresh: `${API_BASE_URL}/auth/refresh`,
  },
  students: {
    profile: `${API_BASE_URL}/students/profile`,
    reservations: `${API_BASE_URL}/students/reservations`,
  },
  lockers: {
    available: `${API_BASE_URL}/lockers/available`,
    byFloor: (floor) => `${API_BASE_URL}/lockers/floor/${floor}`,
    byId: (id) => `${API_BASE_URL}/lockers/${id}`,
  },
  reservations: {
    create: `${API_BASE_URL}/reservations`,
    byId: (id) => `${API_BASE_URL}/reservations/${id}`,
    update: (id) => `${API_BASE_URL}/reservations/${id}`,
    uploadReceipt: `${API_BASE_URL}/reservations/upload-receipt`,
  },
  admin: {
    endorsement: `${API_BASE_URL}/admin/reservations/endorsement`,
    approval: `${API_BASE_URL}/admin/reservations/approval`,
    approve: (id) => `${API_BASE_URL}/admin/reservations/${id}/approve`,
    floorPlans: `${API_BASE_URL}/admin/floor-plans`,
  },
  finance: {
    pending: `${API_BASE_URL}/finance/payments/pending`,
    history: `${API_BASE_URL}/finance/payments/history`,
    verify: (id) => `${API_BASE_URL}/finance/payments/${id}/verify`,
  },
  health: `${API_BASE_URL}/health`,
};

const apiClient = {
  get: async (url, options = {}) => {
    const token = localStorage.getItem("token");
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    });
    return response.json();
  },

  post: async (url, data, options = {}) => {
    const token = localStorage.getItem("token");
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      body: JSON.stringify(data),
      ...options,
    });
    return response.json();
  },

  put: async (url, data, options = {}) => {
    const token = localStorage.getItem("token");
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      body: JSON.stringify(data),
      ...options,
    });
    return response.json();
  },

  delete: async (url, options = {}) => {
    const token = localStorage.getItem("token");
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    });
    return response.json();
  },

  uploadFile: async (url, formData) => {
    const token = localStorage.getItem("token");
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });
    return response.json();
  },
};

export { API_BASE_URL, API_ENDPOINTS, apiClient };
export default API_ENDPOINTS;
