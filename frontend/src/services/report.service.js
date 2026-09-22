import api from "./api";

export const reportService = {
  getStudentReport: async () => {
    return api.get("/reports/student");
  },

  getClassReport: async (classId) => {
    return api.get(`/reports/class/${classId}`);
  },

  getWeeklyReports: async (classId) => {
    return api.get(`/reports/weekly/${classId}`);
  },

  generateWeeklyReport: async (classId, payload = {}) => {
    return api.post(`/reports/weekly/${classId}/generate`, payload);
  },

  getClassAnalytics: async (classId) => {
    return api.get(`/analytics/class/${classId}`);
  },
};

export default reportService;
