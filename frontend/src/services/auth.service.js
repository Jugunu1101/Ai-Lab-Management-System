import api from "./api";

export const authService = {
  login: async (credentials) => {
    return api.post("/auth/login", credentials);
  },

  register: async (userData) => {
    return api.post("/auth/register", userData);
  },

  getMe: async () => {
    return api.get("/auth/me");
  },
};

export default authService;
