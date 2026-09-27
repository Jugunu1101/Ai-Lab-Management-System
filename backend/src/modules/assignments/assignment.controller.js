const assignmentService = require("./assignment.service");

const createAssignment = async (req, res, next) => {
  try {
    const assignment = await assignmentService.createAssignment({
      ...req.body,
      teacherId: req.user.userId,
    });

    return res.status(201).json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

const generateAIAssignment = async (req, res, next) => {
  try {
    const generated = await assignmentService.generateAIAssignment({
      topic: req.body.topic,
      language: req.body.language,
      difficulty: req.body.difficulty,
      questionCount: req.body.questionCount,
      classId: req.body.classId,
      excludedTitles: req.body.excludedTitles,
      excludedAssignments: req.body.excludedAssignments,
      currentTitle: req.body.currentTitle,
      teacherId: req.user.userId,
    });

    return res.status(200).json({
      success: true,
      data: generated,
    });
  } catch (error) {
    next(error);
  }
};

const getAssignments = async (req, res, next) => {
  try {
    const assignments = await assignmentService.getAssignments({
      userId: req.user.userId,
      role: req.user.role,
      limit: req.query.limit,
      page: req.query.page,
      search: req.query.search || req.query.q || req.query.searchTerm,
      topic: req.query.topic,
      difficulty: req.query.difficulty,
    });

    return res.status(200).json({
      success: true,
      data: assignments,
    });
  } catch (error) {
    next(error);
  }
};

const getAssignmentById = async (req, res, next) => {
  try {
    const assignment = await assignmentService.getAssignmentById({
      assignmentId: req.params.assignmentId,
      userId: req.user.userId,
      role: req.user.role,
    });

    return res.status(200).json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

const updateAssignment = async (req, res, next) => {
  try {
    const assignment = await assignmentService.updateAssignment({
      assignmentId: req.params.assignmentId,
      teacherId: req.user.userId,
      updates: req.body,
    });

    return res.status(200).json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

const deleteAssignment = async (req, res, next) => {
  try {
    const assignment = await assignmentService.deleteAssignment({
      assignmentId: req.params.assignmentId,
      teacherId: req.user.userId,
    });

    return res.status(200).json({
      success: true,
      message: "Assignment deleted successfully",
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

const getAssignmentResults = async (req, res, next) => {
  try {
    const results = await assignmentService.getAssignmentResults({
      assignmentId: req.params.assignmentId,
      teacherId: req.user.userId,
    });

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAssignment,
  generateAIAssignment,
  getAssignments,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  getAssignmentResults,
};