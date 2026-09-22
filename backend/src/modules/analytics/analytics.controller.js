const analyticsService = require("./analytics.service");

const getStudentAnalytics = async (req, res, next) => {
  try {
    const analytics = await analyticsService.getStudentAnalytics({
      studentId: req.user.userId,
    });

    return res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
};

const getClassAnalytics = async (req, res, next) => {
  try {
    const analytics = await analyticsService.getClassAnalytics({
      classId: req.params.classId,
      teacherId: req.user.userId,
    });

    return res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
};

const getClassTopicAnalytics = async (req, res, next) => {
  try {
    const analytics = await analyticsService.getClassTopicAnalytics({
      classId: req.params.classId,
      teacherId: req.user.userId,
    });

    return res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStudentAnalytics,
  getClassAnalytics,
  getClassTopicAnalytics,
};
