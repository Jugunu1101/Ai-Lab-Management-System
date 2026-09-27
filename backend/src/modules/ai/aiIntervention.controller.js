const aiInterventionService = require("./aiIntervention.service");

const getInterventions = async (req, res, next) => {
  try {
    const data = await aiInterventionService.getTeacherInterventions({
      teacherId: req.user.userId || req.user.id,
      role: req.user.role,
      query: req.query,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInterventions,
};
