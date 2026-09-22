import api from "./api";

export const collegeService = {
  getPublicColleges: async () => {
    return api.get("/colleges/public");
  },

  getCollegeById: async (id) => {
    return api.get(`/colleges/${id}`);
  },

  updateDomains: async (id, domains) => {
    return api.put(`/colleges/${id}/domains`, { domains });
  },
};

export default collegeService;
