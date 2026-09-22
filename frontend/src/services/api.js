import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    // Return data directly if available
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Don't loop redirect if already on login/register
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    const customError = {
      code: error.response?.data?.error?.code || "NETWORK_ERROR",
      message: error.response?.data?.error?.message || error.response?.data?.message || error.message || "An unexpected error occurred",
      status: error.response?.status,
      details: error.response?.data?.error?.details || null,
    };
    return Promise.reject(customError);
  }
);

export default api;
