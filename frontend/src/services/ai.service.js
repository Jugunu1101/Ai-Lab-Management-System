import api from "./api";

export const aiService = {
  getInterventions: async (params = {}) => {
    return api.get("/ai/interventions", { params });
  },
};

export default aiService;
