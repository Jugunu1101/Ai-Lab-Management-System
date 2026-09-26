import api from "./api";

export const submissionService = {
  submitCode: async ({ assignmentId, code, language }) => {
    return api.post(
      "/submissions",
      { assignmentId, code, language },
      { timeout: 90000 }
    );
  },

  runTests: async ({ assignmentId, code, language }) => {
    return api.post(
      "/submissions/run",
      { assignmentId, code, language },
      { timeout: 60000 }
    );
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
