import api from "./api";

export const classService = {
  getClasses: async () => {
    return api.get("/classes");
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

  addStudentToClass: async (classId, studentData) => {
    return api.post(`/classes/${classId}/students`, studentData);
  },

  joinClassByCode: async (code) => {
    return api.post("/classes/join", { code });
  },
};

export default classService;
