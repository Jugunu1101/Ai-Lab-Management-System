const Quiz = require("./quiz.model");
const QuizAttempt = require("./quizAttempt.model");
const Progress = require("../progress/progress.model");
const { updateProgressFromQuiz } = require("../progress/progress.service");
const { generateQuiz } = require("../../services/ai/ai.service");
const AIAnalysis = require("../../services/ai/aiAnalysis.model");

const createQuiz = async ({ title, language, topic, questions, teacherId }) => {
  const quiz = await Quiz.create({
    title,
    language,
    topic,
    topics: [topic],
    questions,
    createdBy: teacherId,
  });

  return quiz;
};

const createAIQuiz = async ({ studentId, language, topics, questionCount = 3 }) => {
  const aiResult = await generateQuiz({
    student: {
      id: studentId.toString(),
    },
    topics,
    language,
    questionCount,
  });

  if (
    !aiResult ||
    !Array.isArray(aiResult.questions) ||
    aiResult.questions.length === 0
  ) {
    const error = new Error("AI service returned no quiz questions");
    error.statusCode = 502;
    error.code = "AI_INVALID_RESPONSE";
    throw error;
  }

  const questions = aiResult.questions.map((question) => ({
    question: question.question,
    options: question.options,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation || "",
    topic: question.topic || topics[0],
    difficulty: question.difficulty || "medium",
  }));

  return await Quiz.create({
    title: `AI Quiz - ${topics.join(", ")}`,
    language,
    topic: topics[0],
    topics,
    questions,
    studentId,
    createdBy: studentId,
  });
};

const getTodayQuiz = async ({ studentId, language }) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  // 1. Check if today's quiz already exists for this student
  let quiz = await Quiz.findOne({
    studentId,
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });

  // 2. If already exists, return with attempt status
  if (quiz) {
    const attempt = await QuizAttempt.findOne({
      quizId: quiz._id,
      studentId,
    });

    const sanitized = quiz.toObject();
    if (!attempt) {
      sanitized.questions = sanitized.questions.map((q) => {
        const { correctAnswer, ...rest } = q;
        return rest;
      });
    }

    return {
      quiz: sanitized,
      attempt: attempt
        ? {
            score: attempt.score,
            completedAt: attempt.completedAt,
            answers: attempt.answers,
          }
        : null,
      isCompleted: !!attempt,
    };
  }

  // 3. Find weak topics to target
  const weakProgress = await Progress.find({
    studentId,
  })
    .sort({ masteryScore: 1 })
    .limit(3);

  const targetTopics =
    weakProgress.length > 0
      ? weakProgress.map((p) => p.topic)
      : ["basics", "logic", "syntax"];

  const targetLang =
    language ||
    (weakProgress.length > 0 ? weakProgress[0].language : "python");

  // 4. Generate quiz via AI service with heuristic fallback
  let questions = [];
  try {
    const aiResult = await generateQuiz({
      student: { id: studentId.toString() },
      topics: targetTopics,
      language: targetLang,
      questionCount: 3,
    });

    if (aiResult && Array.isArray(aiResult.questions) && aiResult.questions.length > 0) {
      questions = aiResult.questions.map((q) => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || "",
        topic: q.topic || targetTopics[0],
        difficulty: q.difficulty || "medium",
      }));

      // Persist AI analysis log
      await AIAnalysis.create({
        studentId,
        type: "QUIZ_GENERATION",
        inputReference: `daily-${targetTopics.join(",")}`,
        result: aiResult,
        model: aiResult.model || "gemini-1.5-flash",
        promptVersion: aiResult.promptVersion || "1.0",
      }).catch(() => {});
    }
  } catch (err) {
    console.error("AI daily quiz generation failed:", err.message);
  }

  if (questions.length === 0) {
    return {
      quiz: null,
      attempt: null,
      isCompleted: false,
    };
  }

  quiz = await Quiz.create({
    title: `Daily Quiz (${new Date().toLocaleDateString()}) - ${targetTopics.join(", ")}`,
    language: targetLang,
    topic: targetTopics[0],
    topics: targetTopics,
    questions,
    studentId,
    targetDate: startOfDay,
    createdBy: studentId,
  });

  const sanitized = quiz.toObject();
  sanitized.questions = sanitized.questions.map((q) => {
    const { correctAnswer, ...rest } = q;
    return rest;
  });

  return {
    quiz: sanitized,
    attempt: null,
    isCompleted: false,
  };
};

const submitQuiz = async ({ quizId, studentId, answers }) => {
  const quiz = await Quiz.findById(quizId);

  if (!quiz) {
    const error = new Error("Quiz not found");
    error.statusCode = 404;
    error.code = "QUIZ_NOT_FOUND";
    throw error;
  }

  if (!answers || answers.length !== quiz.questions.length) {
    const error = new Error("You must answer all quiz questions");
    error.statusCode = 400;
    error.code = "INVALID_ANSWERS";
    throw error;
  }

  let correctAnswers = 0;

  const evaluatedAnswers = quiz.questions.map((question, index) => {
    const selectedAnswer = answers[index]?.selectedAnswer || "";
    // Normalize both for letter comparison ("A" vs "A) ...")
    const cleanSelected = selectedAnswer.trim().charAt(0).toUpperCase();
    const cleanExpected = question.correctAnswer.trim().charAt(0).toUpperCase();
    const isCorrect =
      selectedAnswer.trim() === question.correctAnswer.trim() ||
      cleanSelected === cleanExpected;

    if (isCorrect) {
      correctAnswers++;
    }

    return {
      questionIndex: index,
      selectedAnswer,
      isCorrect,
    };
  });

  const score = Math.round((correctAnswers / quiz.questions.length) * 100);

  const attempt = await QuizAttempt.create({
    quizId,
    studentId,
    answers: evaluatedAnswers,
    score,
  });

  // Update progress for all quiz topics or primary topic
  const topicsToUpdate = quiz.topics && quiz.topics.length > 0 ? quiz.topics : [quiz.topic];
  for (const topic of topicsToUpdate) {
    await updateProgressFromQuiz({
      studentId,
      language: quiz.language,
      topic,
      quizScore: score,
    }).catch((err) => {
      console.warn("Failed to update progress from quiz:", err.message);
    });
  }

  return {
    attemptId: attempt._id,
    score,
    totalQuestions: quiz.questions.length,
    correctAnswers,
    answers: evaluatedAnswers,
    questions: quiz.questions, // Include explanations and correct answers upon submit
  };
};

const getQuizzes = async ({ language, topic }) => {
  const filter = {};

  if (language) {
    filter.language = language;
  }

  if (topic) {
    filter.topic = topic;
  }

  const quizzes = await Quiz.find(filter)
    .select("-questions.correctAnswer")
    .sort({ createdAt: -1 });

  return quizzes;
};

const getQuizAttempts = async ({ quizId, studentId }) => {
  const quiz = await Quiz.findById(quizId);

  if (!quiz) {
    const error = new Error("Quiz not found");
    error.statusCode = 404;
    error.code = "QUIZ_NOT_FOUND";
    throw error;
  }

  const attempts = await QuizAttempt.find({
    quizId,
    studentId,
  }).sort({ createdAt: -1 });

  return attempts;
};

const getQuizById = async ({ quizId }) => {
  const quiz = await Quiz.findById(quizId).select("-questions.correctAnswer");

  if (!quiz) {
    const error = new Error("Quiz not found");
    error.statusCode = 404;
    error.code = "QUIZ_NOT_FOUND";
    throw error;
  }

  return quiz;
};

module.exports = {
  createQuiz,
  createAIQuiz,
  getTodayQuiz,
  submitQuiz,
  getQuizzes,
  getQuizAttempts,
  getQuizById,
};
