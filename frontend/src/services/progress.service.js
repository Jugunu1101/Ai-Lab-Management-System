import api from "./api";

export const progressService = {
  getProgress: async () => {
    return api.get("/progress");
  },

  getWeakTopics: async () => {
    return api.get("/progress/weak-topics");
  },

  getStudentDashboard: async () => {
    return api.get("/student/dashboard");
  },

  getStudentProgress: async () => {
    return api.get("/student/progress");
  },

  getStudentTopics: async (params = {}) => {
    return api.get("/student/topics", { params });
  },

  getStudentLearningPath: async () => {
    return api.get("/student/learning-path");
  },
};

export default progressService;
