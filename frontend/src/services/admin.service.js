import api from "./api";

export const adminService = {
  getAdminDashboard: async () => {
    return api.get("/admin/dashboard");
  },

  getUsers: async (params = {}) => {
    return api.get("/admin/users", { params });
  },

  getPendingTeachers: async () => {
    return api.get("/admin/teachers/pending");
  },

  approveTeacher: async (userId) => {
    return api.post(`/admin/teachers/${userId}/approve`);
  },

  rejectTeacher: async (userId) => {
    return api.post(`/admin/teachers/${userId}/reject`);
  },

  getUserById: async (userId) => {
    return api.get(`/admin/users/${userId}`);
  },

  createUser: async (userData) => {
    return api.post("/admin/users", userData);
  },

  updateUser: async (userId, data) => {
    return api.put(`/admin/users/${userId}`, data);
  },

  deleteUser: async (userId) => {
    return api.delete(`/admin/users/${userId}`);
  },

  getClasses: async (params = {}) => {
    return api.get("/admin/classes", { params });
  },

  getCollege: async () => {
    return api.get("/admin/college");
  },

  updateCollegeDomains: async (domains) => {
    return api.put("/admin/college/domains", { domains });
  },
};

export default adminService;
