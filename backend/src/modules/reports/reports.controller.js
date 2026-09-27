const reportsService = require("./reports.service");

const getStudentReport = async (req, res, next) => {
  try {
    const report = await reportsService.getStudentReport({
      studentId: req.user.userId,
    });

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

const getClassReport = async (req, res, next) => {
  try {
    const report = await reportsService.getClassReport({
      classId: req.params.classId,
      teacherId: req.user.userId,
    });

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

const getWeeklyReports = async (req, res, next) => {
  try {
    const reports = await reportsService.getWeeklyReportsByClass({
      classId: req.params.classId,
      teacherId: req.user.userId,
      userRole: req.user.role,
    });

    return res.status(200).json({
      success: true,
      data: reports,
    });
  } catch (error) {
    next(error);
  }
};

const generateWeeklyReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.body || {};
    const result = await reportsService.triggerWeeklyReportGeneration({
      classId: req.params.classId,
      teacherId: req.user.userId,
      userRole: req.user.role,
      startDate,
      endDate,
    });

    return res.status(200).json({
      success: true,
      message: "Weekly report generated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStudentReport,
  getClassReport,
  getWeeklyReports,
  generateWeeklyReport,
};
