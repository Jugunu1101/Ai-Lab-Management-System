/**
 * Class Ownership & Delete Tests
 *
 * Tests:
 *  1. Instructor A sees only Instructor A's classes.
 *  2. Instructor B sees only Instructor B's classes.
 *  3. Instructor A cannot access Instructor B's class.
 *  4. Instructor A cannot generate report for Instructor B's class.
 *  5. Instructor A cannot analyze Instructor B's class.
 *  6. Instructor A can delete own class.
 *  7. Instructor A cannot delete Instructor B's class.
 *  8. Student cannot delete class.
 *  9. Unauthenticated user cannot delete class.
 * 10. Creating a class automatically assigns authenticated instructor as teacherId.
 */
const Class = require("../../src/modules/classes/class.model");
const User = require("../../src/modules/users/user.model");
const classService = require("../../src/modules/classes/class.service");

// Setup uses setup.js (MongoMemoryServer + afterEach cleanup) via jest.config

const makeTeacher = async (suffix) =>
  User.create({
    name: `Teacher${suffix}`,
    email: `teacher${suffix}@test.com`,
    passwordHash: "hashed_password_value",
    role: "TEACHER",
  });

const makeStudent = async (suffix) =>
  User.create({
    name: `Student${suffix}`,
    email: `student${suffix}@test.com`,
    passwordHash: "hashed_password_value",
    role: "STUDENT",
  });

const makeClass = async (name, teacherId) =>
  Class.create({
    name,
    teacherId,
    code: `C${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
    students: [],
  });

describe("Class Ownership & Delete Authorization", () => {
  // -------------------------------------------------------------------
  // 1. Instructor A sees only Instructor A's classes
  // -------------------------------------------------------------------
  test("1. Instructor A sees only their own classes", async () => {
    const teacherA = await makeTeacher("A");
    const teacherB = await makeTeacher("B");
    await makeClass("DSA", teacherA._id);
    await makeClass("C++", teacherA._id);
    await makeClass("Python", teacherB._id);

    const classes = await classService.getClasses({
      userId: teacherA._id.toString(),
      role: "TEACHER",
    });

    expect(classes.length).toBe(2);
    classes.forEach((c) => {
      const tid = c.teacherId?._id?.toString() || c.teacherId?.toString();
      expect(tid).toBe(teacherA._id.toString());
    });
  });

  // -------------------------------------------------------------------
  // 2. Instructor B sees only Instructor B's classes
  // -------------------------------------------------------------------
  test("2. Instructor B sees only their own classes", async () => {
    const teacherA = await makeTeacher("A");
    const teacherB = await makeTeacher("B");
    await makeClass("DSA", teacherA._id);
    await makeClass("Python", teacherB._id);
    await makeClass("DBMS", teacherB._id);

    const classes = await classService.getClasses({
      userId: teacherB._id.toString(),
      role: "TEACHER",
    });

    expect(classes.length).toBe(2);
    classes.forEach((c) => {
      const tid = c.teacherId?._id?.toString() || c.teacherId?.toString();
      expect(tid).toBe(teacherB._id.toString());
    });
  });

  // -------------------------------------------------------------------
  // 3. Instructor A cannot access Instructor B's class
  // -------------------------------------------------------------------
  test("3. Instructor A cannot getClassById for Instructor B's class", async () => {
    const teacherA = await makeTeacher("A");
    const teacherB = await makeTeacher("B");
    const classB = await makeClass("Python", teacherB._id);

    await expect(
      classService.getClassById({
        classId: classB._id.toString(),
        userId: teacherA._id.toString(),
        role: "TEACHER",
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  // -------------------------------------------------------------------
  // 4. Instructor A cannot generate report for Instructor B's class
  // -------------------------------------------------------------------
  test("4. Instructor A cannot generate weekly report for Instructor B's class", async () => {
    const teacherA = await makeTeacher("A");
    const teacherB = await makeTeacher("B");
    const classB = await makeClass("Python", teacherB._id);

    const reportsService = require("../../src/modules/reports/reports.service");
    await expect(
      reportsService.generateWeeklyReportData({
        classId: classB._id.toString(),
        teacherId: teacherA._id.toString(),
        userRole: "TEACHER",
        startDate: "2026-09-20",
        endDate: "2026-09-27",
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  // -------------------------------------------------------------------
  // 5. Instructor A cannot analyze Instructor B's class
  // -------------------------------------------------------------------
  test("5. Instructor A cannot get analytics for Instructor B's class", async () => {
    const teacherA = await makeTeacher("A");
    const teacherB = await makeTeacher("B");
    const classB = await makeClass("Python", teacherB._id);

    const analyticsService = require("../../src/modules/analytics/analytics.service");
    await expect(
      analyticsService.getClassAnalytics({
        classId: classB._id.toString(),
        teacherId: teacherA._id.toString(),
        role: "TEACHER",
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  // -------------------------------------------------------------------
  // 6. Instructor A can delete own class
  // -------------------------------------------------------------------
  test("6. Instructor A can delete their own class", async () => {
    const teacherA = await makeTeacher("A");
    const classA = await makeClass("DSA", teacherA._id);

    const result = await classService.deleteClass({
      classId: classA._id.toString(),
      userId: teacherA._id.toString(),
      role: "TEACHER",
    });

    expect(result.deletedClassId).toBe(classA._id.toString());
    expect(result.deletedClassName).toBe("DSA");

    const found = await Class.findById(classA._id);
    expect(found).toBeNull();
  });

  // -------------------------------------------------------------------
  // 7. Instructor A cannot delete Instructor B's class
  // -------------------------------------------------------------------
  test("7. Instructor A cannot delete Instructor B's class", async () => {
    const teacherA = await makeTeacher("A");
    const teacherB = await makeTeacher("B");
    const classB = await makeClass("Python", teacherB._id);

    await expect(
      classService.deleteClass({
        classId: classB._id.toString(),
        userId: teacherA._id.toString(),
        role: "TEACHER",
      })
    ).rejects.toMatchObject({ statusCode: 403 });

    const found = await Class.findById(classB._id);
    expect(found).not.toBeNull();
  });

  // -------------------------------------------------------------------
  // 8. Student cannot delete class
  // -------------------------------------------------------------------
  test("8. Student cannot delete a class", async () => {
    const teacherA = await makeTeacher("A");
    const student = await makeStudent("1");
    const classA = await makeClass("DSA", teacherA._id);

    await expect(
      classService.deleteClass({
        classId: classA._id.toString(),
        userId: student._id.toString(),
        role: "STUDENT",
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  // -------------------------------------------------------------------
  // 9. Unauthenticated user cannot delete class (role = undefined)
  // -------------------------------------------------------------------
  test("9. Unauthenticated (missing role) user cannot delete class", async () => {
    const teacherA = await makeTeacher("A");
    const classA = await makeClass("DSA", teacherA._id);

    await expect(
      classService.deleteClass({
        classId: classA._id.toString(),
        userId: null,
        role: undefined,
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  // -------------------------------------------------------------------
  // 10. Creating a class sets teacherId from authenticated instructor
  // -------------------------------------------------------------------
  test("10. Creating a class automatically assigns authenticated instructor as teacherId", async () => {
    const teacherA = await makeTeacher("A");

    const newClass = await classService.createClass({
      name: "Java 101",
      teacherId: teacherA._id.toString(),
    });

    expect(newClass.teacherId.toString()).toBe(teacherA._id.toString());
    expect(newClass.name).toBe("Java 101");
  });
});
