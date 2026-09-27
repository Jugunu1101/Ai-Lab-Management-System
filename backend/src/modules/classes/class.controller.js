const classService = require("./class.service");

const createClass = async (req, res, next) => {
  try {
    const { name, code, department, description, languages, semester } = req.body;
    const newClass = await classService.createClass({
      name,
      code,
      department,
      description,
      languages,
      semester,
      teacherId: req.user.userId,
      collegeId: req.user.collegeId,
    });

    return res.status(201).json({
      success: true,
      data: newClass,
    });
  } catch (error) {
    next(error);
  }
};

const deleteClass = async (req, res, next) => {
  try {
    const result = await classService.deleteClass({
      classId: req.params.classId,
      userId: req.user.userId,
      role: req.user.role,
    });

    return res.status(200).json({
      success: true,
      message: `Class "${result.deletedClassName}" deleted successfully`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const addStudent = async (req, res, next) => {
  try {
    const updatedClass = await classService.addStudentToClass({
      classId: req.params.classId,
      studentId: req.body.studentId,
      email: req.body.email,
      teacherId: req.user.userId,
    });

    return res.status(200).json({
      success: true,
      data: updatedClass,
    });
  } catch (error) {
    next(error);
  }
};

const getClasses = async (req, res, next) => {
  try {
    const classes = await classService.getClasses({
      userId: req.user.userId,
      role: req.user.role,
      search: req.query.search || req.query.q || req.query.searchTerm,
    });

    return res.status(200).json({
      success: true,
      data: classes,
    });
  } catch (error) {
    next(error);
  }
};

const getClassById = async (req, res, next) => {
  try {
    const classData = await classService.getClassById({
      classId: req.params.classId,
      userId: req.user.userId,
      role: req.user.role,
    });

    return res.status(200).json({
      success: true,
      data: classData,
    });
  } catch (error) {
    next(error);
  }
};

const updateClass = async (req, res, next) => {
  try {
    const updatedClass = await classService.updateClass({
      classId: req.params.classId,
      teacherId: req.user.userId,
      updates: req.body,
    });

    return res.status(200).json({
      success: true,
      data: updatedClass,
    });
  } catch (error) {
    next(error);
  }
};

const joinClassByCode = async (req, res, next) => {
  try {
    const updatedClass = await classService.joinClassByCode({
      code: req.body.code,
      studentId: req.user.userId,
    });

    return res.status(200).json({
      success: true,
      data: updatedClass,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createClass,
  deleteClass,
  addStudent,
  getClasses,
  getClassById,
  updateClass,
  joinClassByCode,
};