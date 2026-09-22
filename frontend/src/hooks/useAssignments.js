import { useState, useEffect, useCallback } from "react";
import assignmentService from "../services/assignment.service";

export const useAssignments = (initialParams = {}) => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [params, setParams] = useState(initialParams);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await assignmentService.getAssignments(params);
      const data = response.data?.assignments || response.assignments || response.data || [];
      setAssignments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  return {
    assignments,
    loading,
    error,
    params,
    setParams,
    refetch: fetchAssignments,
  };
};

export default useAssignments;
