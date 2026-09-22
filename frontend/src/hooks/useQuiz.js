import { useState, useEffect, useCallback } from "react";
import quizService from "../services/quiz.service";

export const useQuiz = () => {
  const [todayQuiz, setTodayQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTodayQuiz = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await quizService.getTodayQuiz();
      const data = response.data?.quiz || response.quiz || response.data || null;
      setTodayQuiz(data);
    } catch (err) {
      setError(err.message || "Failed to load today's quiz");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayQuiz();
  }, [fetchTodayQuiz]);

  return {
    todayQuiz,
    loading,
    error,
    refetch: fetchTodayQuiz,
  };
};

export default useQuiz;
