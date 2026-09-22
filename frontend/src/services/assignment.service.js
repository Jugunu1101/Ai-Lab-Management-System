import api from "./api";

export const assignmentService = {
  getAssignments: async (params = {}) => {
    return api.get("/assignments", { params });
  },

  getAssignmentById: async (assignmentId) => {
    return api.get(`/assignments/${assignmentId}`);
  },

  createAssignment: async (assignmentData) => {
    return api.post("/assignments", assignmentData);
  },

  updateAssignment: async (assignmentId, data) => {
    return api.put(`/assignments/${assignmentId}`, data);
  },

  deleteAssignment: async (assignmentId) => {
    return api.delete(`/assignments/${assignmentId}`);
  },

  getAssignmentResults: async (assignmentId) => {
    return api.get(`/assignments/${assignmentId}/results`);
  },
};

export default assignmentService;
