const axios = require("axios");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

const handleAxiosError = (error, defaultMsg = "AI service request failed") => {
  if (error.response) {
    const detail = error.response.data?.detail;
    const message = Array.isArray(detail)
      ? detail.map((item) => `${item.loc?.join(".")}: ${item.msg}`).join("; ")
      : detail || defaultMsg;

    const aiError = new Error(message);
    aiError.statusCode = error.response.status;
    aiError.code = "AI_SERVICE_ERROR";
    throw aiError;
  }

  const aiError = new Error("AI service is unavailable");
  aiError.statusCode = 503;
  aiError.code = "AI_SERVICE_UNAVAILABLE";
  throw aiError;
};

const analyzeSubmission = async ({
  student,
  assignment,
  submission,
  testResults,
}) => {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/ai/analyze-submission`,
      { student, assignment, submission, testResults },
      { timeout: 15000 }
    );
    return response.data;
  } catch (error) {
    handleAxiosError(error, "Failed to analyze submission");
  }
};

const generateQuiz = async ({
  student,
  topics,
  language,
  questionCount = 3,
  difficulty = "medium",
}) => {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/ai/generate-quiz`,
      { student, topics, language, questionCount, difficulty },
      { timeout: 15000 }
    );
    return response.data;
  } catch (error) {
    handleAxiosError(error, "Failed to generate quiz");
  }
};

const generateLearningPath = async ({
  studentId,
  language,
  mastery = [],
  weakTopics = [],
}) => {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/ai/generate-learning-path`,
      { studentId, language, mastery, weakTopics },
      { timeout: 15000 }
    );
    return response.data;
  } catch (error) {
    handleAxiosError(error, "Failed to generate learning path");
  }
};

const generateWeeklyReport = async (reportData) => {
  try {
    // Try /ai/generate-weekly-report first, fallback to /ai/generate-report if needed
    try {
      const response = await axios.post(
        `${AI_SERVICE_URL}/ai/generate-weekly-report`,
        reportData,
        { timeout: 20000 }
      );
      return response.data;
    } catch (routeErr) {
      if (routeErr.response?.status === 404) {
        const fallback = await axios.post(
          `${AI_SERVICE_URL}/ai/generate-report`,
          reportData,
          { timeout: 20000 }
        );
        return fallback.data;
      }
      throw routeErr;
    }
  } catch (error) {
    handleAxiosError(error, "Failed to generate weekly report");
  }
};

module.exports = {
  analyzeSubmission,
  generateQuiz,
  generateLearningPath,
  generateWeeklyReport,
};
