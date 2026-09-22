const progressService = require("./progress.service");

const getStudentProgress = async (req, res, next) => {
  try {
    const progress = await progressService.getStudentProgress({
      studentId: req.user.userId,
      language: req.query.language,
    });

    return res.status(200).json({
      success: true,
      data: progress,
    });
  } catch (error) {
    next(error);
  }
};

const getWeakTopics = async (req, res, next) => {
  try {
    const progress = await progressService.getWeakTopics({
      studentId: req.user.userId,
      language: req.query.language,
    });

    return res.status(200).json({
      success: true,
      data: progress,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStudentProgress,
  getWeakTopics,
};
