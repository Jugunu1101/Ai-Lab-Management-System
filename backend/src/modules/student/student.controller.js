const studentService = require("./student.service");

const getStudentDashboard = async (req, res, next) => {
  try {
    const data = await studentService.getStudentDashboard({
      studentId: req.user.userId,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getStudentProgress = async (req, res, next) => {
  try {
    const data = await studentService.getStudentProgress({
      studentId: req.user.userId,
      language: req.query.language,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getStudentTopics = async (req, res, next) => {
  try {
    const data = await studentService.getStudentTopics({
      studentId: req.user.userId,
      language: req.query.language,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getStudentLearningPath = async (req, res, next) => {
  try {
    const data = await studentService.getStudentLearningPath({
      studentId: req.user.userId,
      language: req.query.language,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStudentDashboard,
  getStudentProgress,
  getStudentTopics,
  getStudentLearningPath,
};
