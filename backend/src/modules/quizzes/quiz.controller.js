const quizService = require("./quiz.service");

const createQuiz = async (req, res, next) => {
  try {
    const quiz = await quizService.createQuiz({
      title: req.body.title,
      language: req.body.language,
      topic: req.body.topic,
      questions: req.body.questions,
      teacherId: req.user.userId,
    });

    return res.status(201).json({
      success: true,
      data: quiz,
    });
  } catch (error) {
    next(error);
  }
};

const getTodayQuiz = async (req, res, next) => {
  try {
    const result = await quizService.getTodayQuiz({
      studentId: req.user.userId,
      language: req.query.language,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getPracticeQuiz = async (req, res, next) => {
  try {
    const result = await quizService.getPracticeQuiz({
      studentId: req.user.userId,
      language: req.query.language,
      topic: req.query.topic,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const submitQuiz = async (req, res, next) => {
  try {
    const attempt = await quizService.submitQuiz({
      quizId: req.params.quizId || req.params.id,
      studentId: req.user.userId,
      answers: req.body.answers,
    });

    return res.status(200).json({
      success: true,
      data: attempt,
    });
  } catch (error) {
    next(error);
  }
};

const getQuizzes = async (req, res, next) => {
  try {
    const quizzes = await quizService.getQuizzes({
      language: req.query.language,
      topic: req.query.topic,
    });

    return res.status(200).json({
      success: true,
      data: quizzes,
    });
  } catch (error) {
    next(error);
  }
};

const getQuizAttempts = async (req, res, next) => {
  try {
    const attempts = await quizService.getQuizAttempts({
      quizId: req.params.quizId || req.params.id,
      studentId: req.user.userId,
    });

    return res.status(200).json({
      success: true,
      data: attempts,
    });
  } catch (error) {
    next(error);
  }
};

const getQuizById = async (req, res, next) => {
  try {
    const quiz = await quizService.getQuizById({
      quizId: req.params.quizId || req.params.id,
    });

    return res.status(200).json({
      success: true,
      data: quiz,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createQuiz,
  getTodayQuiz,
  getPracticeQuiz,
  submitQuiz,
  getQuizzes,
  getQuizAttempts,
  getQuizById,
};
