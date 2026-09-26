const Submission = require("../submissions/submission.model");
const QuizAttempt = require("../quizzes/quizAttempt.model");
const Progress = require("../progress/progress.model");
const Assignment = require("../assignments/assignment.model");
const Class = require("../classes/class.model");

const getStudentAnalytics = async ({ studentId }) => {
  const [submissions, quizAttempts, progress] = await Promise.all([
    Submission.find({ userId: studentId }).select("score status"),

    QuizAttempt.find({ studentId }).select("score"),

    Progress.find({ studentId }).select(
      "language topic masteryScore assignmentScore quizScore",
    ),
  ]);

  const totalAssignments = submissions.length;

  const averageAssignmentScore =
    totalAssignments > 0
      ? Math.round(
          submissions.reduce((sum, submission) => sum + submission.score, 0) /
            totalAssignments,
        )
      : 0;

  const totalQuizzes = quizAttempts.length;

  const averageQuizScore =
    totalQuizzes > 0
      ? Math.round(
          quizAttempts.reduce((sum, attempt) => sum + attempt.score, 0) /
            totalQuizzes,
        )
      : 0;

  const averageMasteryScore =
    progress.length > 0
      ? Math.round(
          progress.reduce((sum, item) => sum + item.masteryScore, 0) /
            progress.length,
        )
      : 0;

  const weakTopics = progress
    .filter((item) => item.masteryScore < 50)
    .sort((a, b) => a.masteryScore - b.masteryScore)
    .map((item) => ({
      language: item.language,
      topic: item.topic,
      masteryScore: item.masteryScore,
    }));

  const allTopics = progress
    .sort((a, b) => b.masteryScore - a.masteryScore)
    .map((item) => ({
      language: item.language,
      topic: item.topic,
      masteryScore: item.masteryScore,
    }));

  return {
    totalAssignments,
    averageAssignmentScore,
    totalQuizzes,
    averageQuizScore,
    averageMasteryScore,
    weakTopics,
    allTopics,
  };
};

const getClassAnalytics = async ({ classId, teacherId }) => {
  const classData = await Class.findById(classId);

  if (!classData) {
    const error = new Error("Class not found");
    error.statusCode = 404;
    error.code = "CLASS_NOT_FOUND";
    throw error;
  }

  if (classData.teacherId.toString() !== teacherId) {
    const error = new Error(
      "You do not have access to analytics for this class",
    );
    error.statusCode = 403;
    error.code = "FORBIDDEN";
    throw error;
  }

  const assignments = await Assignment.find({
    classId,
  }).select("_id title");

  const assignmentIds = assignments.map((assignment) => assignment._id);

  const submissions = await Submission.find({
    assignmentId: { $in: assignmentIds },
  }).select("userId assignmentId score status");

  const studentCount = classData.students.length;

  const submissionCount = submissions.length;

  const averageScore =
    submissionCount > 0
      ? Math.round(
          submissions.reduce((sum, submission) => sum + submission.score, 0) /
            submissionCount,
        )
      : 0;

  const completedSubmissions = submissions.filter(
    (submission) => submission.status === "COMPLETED",
  ).length;

  const completionRate =
    studentCount > 0 && assignmentIds.length > 0
      ? Math.round(
          (completedSubmissions / (studentCount * assignmentIds.length)) * 100,
        )
      : 0;

  return {
    classId,
    studentCount,
    assignmentCount: assignmentIds.length,
    submissionCount,
    averageScore,
    completionRate,
  };
};

const getClassTopicAnalytics = async ({ classId, teacherId }) => {
  const classData = await Class.findById(classId);

  if (!classData) {
    const error = new Error("Class not found");
    error.statusCode = 404;
    error.code = "CLASS_NOT_FOUND";
    throw error;
  }

  if (classData.teacherId.toString() !== teacherId) {
    const error = new Error(
      "You do not have access to analytics for this class",
    );
    error.statusCode = 403;
    error.code = "FORBIDDEN";
    throw error;
  }

  const progress = await Progress.find({
    studentId: { $in: classData.students },
  }).select("studentId language topic masteryScore assignmentScore quizScore");

  const topicMap = {};

  for (const item of progress) {
    const key = `${item.language}:${item.topic}`;

    if (!topicMap[key]) {
      topicMap[key] = {
        language: item.language,
        topic: item.topic,
        totalMastery: 0,
        totalStudents: 0,
      };
    }

    topicMap[key].totalMastery += item.masteryScore;
    topicMap[key].totalStudents += 1;
  }

  const topics = Object.values(topicMap)
    .map((item) => ({
      language: item.language,
      topic: item.topic,
      averageMasteryScore:
        item.totalStudents > 0
          ? Math.round(item.totalMastery / item.totalStudents)
          : 0,
    }))
    .sort((a, b) => a.averageMasteryScore - b.averageMasteryScore);

  const weakTopics = topics.filter((topic) => topic.averageMasteryScore < 50);

  return {
    classId,
    topics,
    weakTopics,
  };
};

const getStudentAnalyticsById = async ({ studentId, teacherId }) => {
  // Verify teacher has access to this student (student must be in one of teacher's classes)
  const classes = await Class.find({
    teacherId,
    students: studentId,
  }).select("_id");

  if (classes.length === 0) {
    const error = new Error(
      "Student not found in any of your classes"
    );
    error.statusCode = 404;
    error.code = "STUDENT_NOT_FOUND";
    throw error;
  }

  // Reuse the existing analytics function
  return getStudentAnalytics({ studentId });
};

const getStudentProfileById = async ({ studentId, teacherId, role }) => {
  // If not admin, verify teacher has access to this student
  if (role !== "ADMIN") {
    const classes = await Class.find({
      teacherId,
      students: studentId,
    }).select("_id");

    if (classes.length === 0) {
      const error = new Error("Student not found in any of your classes");
      error.statusCode = 404;
      error.code = "STUDENT_NOT_FOUND";
      throw error;
    }
  }

  const User = require("../users/user.model");
  const student = await User.findById(studentId).select("name email collegeId department role");
  if (!student) {
      const error = new Error("Student not found");
      error.statusCode = 404;
      error.code = "STUDENT_NOT_FOUND";
      throw error;
  }
  return student;
};

module.exports = {
  getStudentAnalytics,
  getClassAnalytics,
  getClassTopicAnalytics,
  getStudentAnalyticsById,
  getStudentProfileById,
};
