import api from "./api";

export const submissionService = {
  submitCode: async ({ assignmentId, code, language }) => {
    return api.post("/submissions", { assignmentId, code, language });
  },

  getSubmissions: async (params = {}) => {
    return api.get("/submissions", { params });
  },

  getSubmissionById: async (submissionId) => {
    return api.get(`/submissions/${submissionId}`);
  },

  getAssignmentSubmissions: async (assignmentId) => {
    return api.get(`/submissions/assignment/${assignmentId}`);
  },

  getSubmissionDetailsForTeacher: async (submissionId) => {
    return api.get(`/submissions/${submissionId}/details`);
  },
};

export default submissionService;
