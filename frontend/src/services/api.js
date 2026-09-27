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


const sanitizeErrorMessage = (error, url = "") => {
  const code = error.response?.data?.error?.code;
  const rawMessage =
    error.response?.data?.error?.message ||
    error.response?.data?.message ||
    error.message ||
    "";
  const status = error.response?.status;

  const isDatabaseError =
    code === "DATABASE_UNAVAILABLE" ||
    rawMessage.includes("ENOTFOUND") ||
    rawMessage.includes("mongodb.net") ||
    rawMessage.includes("MongoServerSelectionError") ||
    rawMessage.includes("MongoNetworkError") ||
    rawMessage.includes("buffering timed out") ||
    rawMessage.includes("Database is unavailable") ||
    (rawMessage.includes("ECONNREFUSED") && (rawMessage.includes("27017") || rawMessage.includes("mongo")));

  if (isDatabaseError) {
    if (url.includes("/submissions") && !url.includes("/submissions/run")) {
      return "Submission could not be saved. Please check the local database connection.";
    }
    if (url.includes("/assignments")) {
      return "Unable to load assignments. Please check that the backend and database are running.";
    }
    return "Database is unavailable. Please start the local database or check your connection.";
  }

  const isCodeExecError =
    code === "CODE_EXECUTION_UNAVAILABLE" ||
    (rawMessage.toLowerCase().includes("code execution") && rawMessage.toLowerCase().includes("unavailable")) ||
    rawMessage.includes("docker") ||
    rawMessage.includes("Docker");

  if (isCodeExecError && (url.includes("/run") || url.includes("/submissions"))) {
    return "Code execution service is unavailable. Please make sure the execution service is running.";
  }

  const isNetworkRefused =
    error.code === "ECONNABORTED" ||
    rawMessage.includes("Network Error") ||
    rawMessage.includes("ECONNREFUSED") ||
    status === 502 ||
    status === 504;

  if (isNetworkRefused) {
    return "Unable to connect to the backend server. Please verify the backend is running.";
  }

  const isAiServiceError =
    code === "AI_SERVICE_UNAVAILABLE" ||
    rawMessage.includes("AI service is unavailable") ||
    rawMessage.includes("AI service is temporarily unavailable");

  if (isAiServiceError) {
    return "AI service is currently unavailable. Please verify the AI service is running or switch to mock mode.";
  }

  // 403 Forbidden - permission message
  if (status === 403) {
    return rawMessage || "You do not have permission to perform this action.";
  }

  // 401 Unauthorized - authentication failure message
  if (status === 401) {
    return "Your session has expired or authentication is required. Please sign in.";
  }

  // 500+ Internal Server Error - never display permission message for server errors
  if (status >= 500) {
    if (isDatabaseError) {
      return "Database is unavailable. Please start the local database or check your connection.";
    }
    if (isAiServiceError) {
      return "AI service is currently unavailable. Please verify the AI service is running or switch to mock mode.";
    }
    return rawMessage && !rawMessage.toLowerCase().includes("permission")
      ? rawMessage
      : "An internal server error occurred. Please try again later.";
  }

  return rawMessage || "An unexpected error occurred";
};

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

    const url = error.config?.url || "";
    const cleanMessage = sanitizeErrorMessage(error, url);

    const customError = {
      code: error.response?.data?.error?.code || (error.response ? "HTTP_ERROR" : "NETWORK_ERROR"),
      message: cleanMessage,
      status: error.response?.status,
      details: error.response?.data?.error?.details || null,
    };
    return Promise.reject(customError);
  }
);

export default api;

