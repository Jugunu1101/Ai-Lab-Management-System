import React, { useState, useEffect } from "react";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import ErrorState from "../../components/shared/ErrorState";
import { useAuth } from "../../context/AuthContext";
import progressService from "../../services/progress.service";
import assignmentService from "../../services/assignment.service";

// Redesigned modular components
import DashboardHeader from "../../components/student/dashboard/DashboardHeader";
import LearningProgressHero from "../../components/student/dashboard/LearningProgressHero";
import CurrentFocusCard from "../../components/student/dashboard/CurrentFocusCard";
import AIRecommendationCard from "../../components/student/dashboard/AIRecommendationCard";
import QuickActionsSection from "../../components/student/dashboard/QuickActionsSection";
import TopicsToImproveSection from "../../components/student/dashboard/TopicsToImproveSection";
import DailyQuizCard from "../../components/student/dashboard/DailyQuizCard";
import LearningPathSummaryCard from "../../components/student/dashboard/LearningPathSummaryCard";
import RecentAssignmentsTable from "../../components/student/dashboard/RecentAssignmentsTable";
import RecentActivityTimeline from "../../components/student/dashboard/RecentActivityTimeline";
import MotivationCard from "../../components/student/dashboard/MotivationCard";

import "./StudentDashboard.css";

export const StudentDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [dashData, setDashData] = useState(null);
  const [learningPath, setLearningPath] = useState(null);
  const [topicMastery, setTopicMastery] = useState([]);
  const [recentAssignments, setRecentAssignments] = useState([]);
  const [searchFilter, setSearchFilter] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, pathRes, progressRes, assignRes] = await Promise.allSettled([
        progressService.getStudentDashboard(),
        progressService.getStudentLearningPath(),
        progressService.getStudentProgress(),
        assignmentService.getAssignments({ limit: 8 }),
      ]);

      if (dashRes.status === "fulfilled") {
        setDashData(dashRes.value.data || dashRes.value);
      }

      if (pathRes.status === "fulfilled") {
        const pathData =
          pathRes.value.data?.learningPath ||
          pathRes.value.learningPath ||
          pathRes.value.data ||
          pathRes.value;
        setLearningPath(pathData);
      }

      if (progressRes.status === "fulfilled") {
        const pData = progressRes.value.data || progressRes.value;
        if (pData?.languages?.length > 0) {
          const allTopics = pData.languages
            .flatMap((l) => l.topics)
            .sort((a, b) => (a.masteryScore || 0) - (b.masteryScore || 0));
          setTopicMastery(allTopics);
        } else if (Array.isArray(pData?.topics)) {
          setTopicMastery(pData.topics);
        }
      }

      if (assignRes.status === "fulfilled") {
        const aData =
          assignRes.value.data?.assignments ||
          assignRes.value.assignments ||
          assignRes.value.data ||
          [];
        setRecentAssignments(Array.isArray(aData) ? aData : []);
      }
    } catch (err) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <LoadingSpinner tip="Loading your learning hub..." />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

  // 1. Identify AI recommendation from backend data
  const aiRecommended =
    dashData?.aiRecommendedAssignment ||
    learningPath?.aiRecommendedAssignment ||
    recentAssignments.find(
      (a) =>
        (a.source === "AI_AGENT" || a.source === "AI_GENERATED") &&
        a.status !== "COMPLETED" &&
        a.status !== "PASSED"
    );

  // 2. Real metrics for hero section
  const overallMastery =
    dashData?.overallMastery ??
    dashData?.averageScore ??
    (topicMastery.length > 0
      ? Math.round(topicMastery.reduce((acc, t) => acc + (t.masteryScore || 0), 0) / topicMastery.length)
      : 0);
  
  // Calculate completed quizzes count from real submissions or quiz status
  const completedQuizzesCount =
    (dashData?.todayQuizStatus?.completed ? 1 : 0) +
    (dashData?.recentSubmissions?.filter((s) => s.type === "QUIZ" || s.quizId)?.length || 0);

  // Solved assignments from real submissions
  const assignmentsSolvedCount =
    dashData?.recentSubmissions?.filter(
      (s) => s.status === "PASSED" || s.status === "COMPLETED" || (s.score && s.score >= 60)
    )?.length || (dashData?.totalSubmissions > 0 ? dashData.totalSubmissions : 0);

  // Practice questions from attempts or submissions
  const practiceQuestionsCount =
    topicMastery.reduce((acc, t) => acc + (t.attempts || 0), 0) ||
    dashData?.totalSubmissions ||
    0;

  // Streak (real value if present, otherwise default to 0 days)
  const currentStreakDays = dashData?.currentStreak || (dashData?.todayQuizStatus?.completed ? 1 : 0);

  // 3. Identify weak topic for Current Focus
  const weakTopic =
    dashData?.weakTopics?.[0] ||
    topicMastery.find((t) => (t.masteryScore ?? 100) < 60) ||
    learningPath?.targetFocus?.[0] ||
    "Recursion";

  // 4. Primary language
  const primaryLanguage =
    weakTopic?.language ||
    topicMastery[0]?.language ||
    learningPath?.language ||
    "C++";

  // Filter assignments based on search term if user types
  const cleanFilter = searchFilter.trim().toLowerCase();
  const filteredAssignments = cleanFilter
    ? recentAssignments.filter((a) => {
        const titleMatch = a.title?.toLowerCase().includes(cleanFilter);
        const topicMatch = a.topic?.toLowerCase().includes(cleanFilter);
        const descMatch = a.description?.toLowerCase().includes(cleanFilter);
        const topicsMatch =
          Array.isArray(a.topics) &&
          a.topics.some((t) => t?.toLowerCase().includes(cleanFilter));
        const langMatch =
          a.language?.toLowerCase().includes(cleanFilter) ||
          a.programmingLanguage?.toLowerCase().includes(cleanFilter);
        return titleMatch || topicMatch || descMatch || topicsMatch || langMatch;
      })
    : recentAssignments;

  return (
    <div className="cl-dashboard-container">
      {/* PHASE 6: TOP HEADER BAR */}
      <DashboardHeader user={user} onSearch={setSearchFilter} />

      <div className="cl-dashboard-gap">
        {/* PHASE 7 & 8: HERO ROW (Learning Progress + Current Focus) */}
        <div className="cl-hero-grid">
          <LearningProgressHero
            overallMastery={overallMastery}
            completedQuizzes={completedQuizzesCount}
            assignmentsSolved={assignmentsSolvedCount}
            practiceQuestions={practiceQuestionsCount}
            currentStreak={currentStreakDays}
          />

          <CurrentFocusCard
            weakTopic={weakTopic}
            targetFocus={learningPath?.targetFocus}
          />
        </div>

        {/* PHASE 9: AI RECOMMENDED FOR YOU */}
        <AIRecommendationCard aiAssignment={aiRecommended} />

        {/* PHASE 10, 11, 12, 13: MIDDLE SECTION */}
        <div className="cl-middle-grid">
          {/* Left Column: Topics to Improve */}
          <TopicsToImproveSection topicMastery={topicMastery} />

          {/* Right Column: Stack of Daily AI Quiz + Learning Path + Quick Actions */}
          <div className="cl-side-stack">
            <DailyQuizCard
              todayQuizStatus={dashData?.todayQuizStatus}
              learningLanguage={primaryLanguage}
            />

            <LearningPathSummaryCard learningPath={learningPath} />

            <QuickActionsSection
              weakTopic={typeof weakTopic === "string" ? weakTopic : weakTopic?.topic}
              activeAssignmentsCount={dashData?.activeAssignmentsCount ?? filteredAssignments.length}
            />
          </div>
        </div>

        {/* PHASE 14 & 15: BOTTOM SECTION (Recent Assignments + Recent Activity) */}
        <div className="cl-bottom-grid">
          <RecentAssignmentsTable assignments={filteredAssignments} />

          <RecentActivityTimeline
            submissions={dashData?.recentSubmissions || []}
            todayQuizStatus={dashData?.todayQuizStatus}
            aiAssignment={aiRecommended}
          />
        </div>

        {/* PHASE 16: MOTIVATION PROGRESS SECTION */}
        <MotivationCard />
      </div>
    </div>
  );
};

export default StudentDashboard;
