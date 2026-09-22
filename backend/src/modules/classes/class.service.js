const Class = require("./class.model");
const User = require("../users/user.model");

const createClass = async ({
  name,
  code,
  department,
  description,
  languages,
  semester,
  teacherId,
  collegeId,
}) => {
  const newClass = await Class.create({
    name,
    code,
    department,
    description,
    languages: languages && languages.length > 0 ? languages : ["javascript", "python", "cpp", "java"],
    semester,
    teacherId,
    collegeId,
    students: [],
  });

  return newClass;
};

const addStudentToClass = async ({
  classId,
  studentId,
  teacherId,
}) => {
  const classData = await Class.findById(classId);

  if (!classData) {
    const error = new Error("Class not found");
    error.statusCode = 404;
    error.code = "CLASS_NOT_FOUND";
    throw error;
  }

  if (classData.teacherId.toString() !== teacherId) {
    const error = new Error("You do not have access to this class");
    error.statusCode = 403;
    error.code = "FORBIDDEN";
    throw error;
  }

  const student = await User.findById(studentId);

  if (!student) {
    const error = new Error("Student not found");
    error.statusCode = 404;
    error.code = "STUDENT_NOT_FOUND";
    throw error;
  }

  if (student.role !== "STUDENT") {
    const error = new Error("Only students can be added to a class");
    error.statusCode = 400;
    error.code = "INVALID_STUDENT";
    throw error;
  }

  const alreadyEnrolled = classData.students.some(
    (id) => id.toString() === studentId
  );

  if (alreadyEnrolled) {
    const error = new Error("Student is already enrolled in this class");
    error.statusCode = 409;
    error.code = "STUDENT_ALREADY_ENROLLED";
    throw error;
  }

  classData.students.push(studentId);

  await classData.save();

  return classData;
};

const getClasses = async ({ userId, role }) => {
  let classes;

  if (role === "TEACHER") {
    classes = await Class.find({
      teacherId: userId,
    }).populate("teacherId", "name email");

  } else if (role === "STUDENT") {
    classes = await Class.find({
      students: userId,
    }).populate("teacherId", "name email");

  } else {
    classes = [];
  }

  return classes;
};

const getClassById = async ({ classId, userId, role }) => {
  const classData = await Class.findById(classId)
    .populate("teacherId", "name email")
    .populate("students", "name email");

  if (!classData) {
    const error = new Error("Class not found");
    error.statusCode = 404;
    error.code = "CLASS_NOT_FOUND"
    throw error;
  }

  if (role === "TEACHER") {
    const teacherId = classData.teacherId._id.toString();

    if (teacherId !== userId) {
      const error = new Error("You do not have access to this class");
      error.statusCode = 403;
      error.code = "FORBIDDEN";
      throw error;
    }
  }

  if (role === "STUDENT") {
    const isEnrolled = classData.students.some(
      (student) => student._id.toString() === userId
    );

    if (!isEnrolled) {
      const error = new Error("You do not have access to this class");
      error.statusCode = 403;
      error.code = "FORBIDDEN";
      throw error;
    }
  }

  return classData;
};

const updateClass = async ({
  classId,
  teacherId,
  updates,
}) => {
  const classData = await Class.findById(classId);

  if (!classData) {
    const error = new Error("Class not found");
    error.statusCode = 404;
    error.code = "CLASS_NOT_FOUND";
    throw error;
  }

  if (classData.teacherId.toString() !== teacherId) {
    const error = new Error("You do not have permission to update this class");
    error.statusCode = 403;
    error.code = "FORBIDDEN";
    throw error;
  }

  if (updates.name !== undefined) {
    classData.name = updates.name;
  }

  if (updates.languages !== undefined) {
    classData.languages = updates.languages;
  }

  if (updates.semester !== undefined) {
    classData.semester = updates.semester;
  }

  await classData.save();

  return classData;
};

module.exports = {
  createClass,
  addStudentToClass,
  getClasses,
  getClassById,
  updateClass,
};