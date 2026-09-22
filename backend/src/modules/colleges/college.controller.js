const collegeService = require("./college.service");

const getPublicColleges = async (req, res, next) => {
  try {
    const colleges = await collegeService.getPublicColleges();
    return res.status(200).json({ success: true, data: colleges });
  } catch (error) {
    next(error);
  }
};

const getCollegeById = async (req, res, next) => {
  try {
    const college = await collegeService.getCollegeById(req.params.id);
    return res.status(200).json({ success: true, data: college });
  } catch (error) {
    next(error);
  }
};

const createCollege = async (req, res, next) => {
  try {
    const college = await collegeService.createCollege(req.body);
    return res.status(201).json({ success: true, data: college });
  } catch (error) {
    next(error);
  }
};

const updateCollegeDomains = async (req, res, next) => {
  try {
    const collegeId = req.user.collegeId || req.params.id;
    const college = await collegeService.updateCollegeDomains(
      collegeId,
      req.body.domains
    );
    return res.status(200).json({ success: true, data: college });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPublicColleges,
  getCollegeById,
  createCollege,
  updateCollegeDomains,
};
