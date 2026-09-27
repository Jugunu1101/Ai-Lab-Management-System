import api from "./api";

export const classService = {
  getClasses: async (params = {}) => {
    return api.get("/classes", { params });
  },

  getClassById: async (classId) => {
    return api.get(`/classes/${classId}`);
  },

  createClass: async (data) => {
    return api.post("/classes", data);
  },

  updateClass: async (classId, data) => {
    return api.put(`/classes/${classId}`, data);
  },

  deleteClass: async (classId) => {
    return api.delete(`/classes/${classId}`);
  },

  addStudentToClass: async (classId, studentData) => {
    return api.post(`/classes/${classId}/students`, studentData);
  },

  joinClassByCode: async (code) => {
    return api.post("/classes/join", { code });
  },

  getTeacherDashboard: async () => {
    return api.get("/analytics/teacher-dashboard");
  },

  getClassAnalytics: async (classId) => {
    return api.get(`/analytics/class/${classId}`);
  },

  getClassTopicAnalytics: async (classId) => {
    return api.get(`/analytics/class/${classId}/topics`);
  },
};

export default classService;
