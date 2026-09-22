import api from "./api";

export const quizService = {
  getTodayQuiz: async () => {
    return api.get("/quiz/today");
  },

  getQuizzes: async (params = {}) => {
    return api.get("/quizzes", { params });
  },

  getQuizById: async (quizId) => {
    return api.get(`/quizzes/${quizId}`);
  },

  createQuiz: async (quizData) => {
    return api.post("/quizzes", quizData);
  },

  submitQuiz: async (quizId, answers) => {
    return api.post(`/quizzes/${quizId}/submit`, { answers });
  },

  getQuizAttempts: async (quizId) => {
    return api.get(`/quizzes/${quizId}/attempts`);
  },
};

export default quizService;
