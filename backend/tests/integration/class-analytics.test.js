const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../../src/app");
const User = require("../../src/modules/users/user.model");
const College = require("../../src/modules/colleges/college.model");
const Class = require("../../src/modules/classes/class.model");
const Assignment = require("../../src/modules/assignments/assignment.model");
const Submission = require("../../src/modules/submissions/submission.model");
const Progress = require("../../src/modules/progress/progress.model");
const jwt = require("jsonwebtoken");

describe("Class Analytics & Telemetry API", () => {
  let college;
  let teacherA;
  let teacherB;
  let teacherAToken;
  let teacherBToken;
  let studentUser;
  let studentToken;

  beforeEach(async () => {
    college = await College.create({
      name: "Engineering Institute",
      code: "ENG",
      domains: ["eng.edu"],
      status: "ACTIVE",
    });

    teacherA = await User.create({
      name: "Teacher Alpha",
      email: `teacher_a_${Date.now()}@eng.edu`,
      passwordHash: "hash123",
      role: "TEACHER",
      collegeId: college._id,
      approvalStatus: "APPROVED",
    });
    teacherAToken = jwt.sign(
      { userId: teacherA._id.toString(), email: teacherA.email, role: "TEACHER" },
      process.env.JWT_SECRET || "test-secret-key-for-jest"
    );

    teacherB = await User.create({
      name: "Teacher Beta",
      email: `teacher_b_${Date.now()}@eng.edu`,
      passwordHash: "hash123",
      role: "TEACHER",
      collegeId: college._id,
      approvalStatus: "APPROVED",
    });
    teacherBToken = jwt.sign(
      { userId: teacherB._id.toString(), email: teacherB.email, role: "TEACHER" },
      process.env.JWT_SECRET || "test-secret-key-for-jest"
    );

    studentUser = await User.create({
      name: "Student Alpha",
      email: `student_${Date.now()}@eng.edu`,
      passwordHash: "hash123",
      role: "STUDENT",
      collegeId: college._id,
      approvalStatus: "APPROVED",
    });
    studentToken = jwt.sign(
      { userId: studentUser._id.toString(), email: studentUser.email, role: "STUDENT" },
      process.env.JWT_SECRET || "test-secret-key-for-jest"
    );
  });

  // CASE 1: No data
  it("CASE 1 — No data returns hasData: false, null averages and 0 weak topics", async () => {
    const classDoc = await Class.create({
      name: "Empty Class",
      teacherId: teacherA._id,
      students: [studentUser._id],
      languages: ["python"],
    });

    const res = await request(app)
      .get(`/api/analytics/class/${classDoc._id}`)
      .set("Authorization", `Bearer ${teacherAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data.hasData).toBe(false);
    expect(data.classAverage).toBeNull();
    expect(data.medianStudentScore).toBeNull();
    expect(data.weakTopicCount).toBe(0);
    expect(data.weakTopicHotspots).toEqual([]);
    expect(data.scoreDistribution).toEqual([]);
  });

  // CASE 2: One student
  it("CASE 2 — One student with score 80 results in average 80 and median 80", async () => {
    const classDoc = await Class.create({
      name: "Solo Cohort",
      teacherId: teacherA._id,
      students: [studentUser._id],
      languages: ["python"],
    });

    const assignment = await Assignment.create({
      title: "Solo Assignment",
      description: "Description",
      language: "python",
      difficulty: "EASY",
      classId: classDoc._id,
      createdBy: teacherA._id,
      testCases: [{ input: "1", expectedOutput: "1", isHidden: false }],
    });

    await Submission.create({
      assignmentId: assignment._id,
      userId: studentUser._id,
      code: "print(1)",
      language: "python",
      status: "PASSED",
      score: 80,
      attemptNumber: 1,
    });

    const res = await request(app)
      .get(`/api/analytics/class/${classDoc._id}`)
      .set("Authorization", `Bearer ${teacherAToken}`);

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.hasData).toBe(true);
    expect(data.classAverage).toBe(80);
    expect(data.medianStudentScore).toBe(80);
  });

  // CASE 3: Three students (Odd count: 80, 60, 40)
  it("CASE 3 — Three students with scores 80, 60, 40 results in average 60 and median 60", async () => {
    const s1 = await User.create({ name: "S1", email: `s1_${Date.now()}@eng.edu`, role: "STUDENT", passwordHash: "hash123" });
    const s2 = await User.create({ name: "S2", email: `s2_${Date.now()}@eng.edu`, role: "STUDENT", passwordHash: "hash123" });
    const s3 = await User.create({ name: "S3", email: `s3_${Date.now()}@eng.edu`, role: "STUDENT", passwordHash: "hash123" });

    const classDoc = await Class.create({
      name: "Trio Cohort",
      teacherId: teacherA._id,
      students: [s1._id, s2._id, s3._id],
      languages: ["python"],
    });

    const assignment = await Assignment.create({
      title: "Trio Assignment",
      description: "Desc",
      language: "python",
      difficulty: "EASY",
      classId: classDoc._id,
      createdBy: teacherA._id,
    });

    await Submission.create({ assignmentId: assignment._id, userId: s1._id, code: "code", language: "python", status: "PASSED", score: 80, attemptNumber: 1 });
    await Submission.create({ assignmentId: assignment._id, userId: s2._id, code: "code", language: "python", status: "PASSED", score: 60, attemptNumber: 1 });
    await Submission.create({ assignmentId: assignment._id, userId: s3._id, code: "code", language: "python", status: "PASSED", score: 40, attemptNumber: 1 });

    const res = await request(app)
      .get(`/api/analytics/class/${classDoc._id}`)
      .set("Authorization", `Bearer ${teacherAToken}`);

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.hasData).toBe(true);
    expect(data.classAverage).toBe(60);
    expect(data.medianStudentScore).toBe(60);
  });

  // CASE 4: Even student count (40, 60, 80, 100)
  it("CASE 4 — Even student count 40, 60, 80, 100 results in average 70 and median 70", async () => {
    const s1 = await User.create({ name: "S1", email: `s1_${Date.now()}@eng.edu`, role: "STUDENT", passwordHash: "hash123" });
    const s2 = await User.create({ name: "S2", email: `s2_${Date.now()}@eng.edu`, role: "STUDENT", passwordHash: "hash123" });
    const s3 = await User.create({ name: "S3", email: `s3_${Date.now()}@eng.edu`, role: "STUDENT", passwordHash: "hash123" });
    const s4 = await User.create({ name: "S4", email: `s4_${Date.now()}@eng.edu`, role: "STUDENT", passwordHash: "hash123" });

    const classDoc = await Class.create({
      name: "Quartet Cohort",
      teacherId: teacherA._id,
      students: [s1._id, s2._id, s3._id, s4._id],
      languages: ["python"],
    });

    const assignment = await Assignment.create({
      title: "Quartet Assignment",
      description: "Desc",
      language: "python",
      difficulty: "EASY",
      classId: classDoc._id,
      createdBy: teacherA._id,
    });

    await Submission.create({ assignmentId: assignment._id, userId: s1._id, code: "code", language: "python", status: "PASSED", score: 40, attemptNumber: 1 });
    await Submission.create({ assignmentId: assignment._id, userId: s2._id, code: "code", language: "python", status: "PASSED", score: 60, attemptNumber: 1 });
    await Submission.create({ assignmentId: assignment._id, userId: s3._id, code: "code", language: "python", status: "PASSED", score: 80, attemptNumber: 1 });
    await Submission.create({ assignmentId: assignment._id, userId: s4._id, code: "code", language: "python", status: "PASSED", score: 100, attemptNumber: 1 });

    const res = await request(app)
      .get(`/api/analytics/class/${classDoc._id}`)
      .set("Authorization", `Bearer ${teacherAToken}`);

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.hasData).toBe(true);
    expect(data.classAverage).toBe(70);
    expect(data.medianStudentScore).toBe(70);
  });

  // CASE 5: Weak topic detection (Loops = 40, Arrays = 75)
  it("CASE 5 — Weak topic correctly identifies Loops (40%) and not Arrays (75%)", async () => {
    const classDoc = await Class.create({
      name: "Topic Cohort",
      teacherId: teacherA._id,
      students: [studentUser._id],
      languages: ["python"],
    });

    await Progress.create({
      studentId: studentUser._id,
      language: "python",
      topic: "Loops",
      masteryScore: 40,
    });

    await Progress.create({
      studentId: studentUser._id,
      language: "python",
      topic: "Arrays",
      masteryScore: 75,
    });

    const res = await request(app)
      .get(`/api/analytics/class/${classDoc._id}`)
      .set("Authorization", `Bearer ${teacherAToken}`);

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.weakTopicCount).toBe(1);
    expect(data.weakTopicHotspots).toHaveLength(1);
    expect(data.weakTopicHotspots[0].topic).toBe("Loops");
    expect(data.weakTopicHotspots[0].score).toBe(40);
  });

  // CASE 6: Exact threshold (Topic score = 50 is NOT weak)
  it("CASE 6 — Exact threshold 50% is NOT weak (< 50% rule)", async () => {
    const classDoc = await Class.create({
      name: "Threshold Cohort",
      teacherId: teacherA._id,
      students: [studentUser._id],
      languages: ["python"],
    });

    await Progress.create({
      studentId: studentUser._id,
      language: "python",
      topic: "Conditionals",
      masteryScore: 50,
    });

    const res = await request(app)
      .get(`/api/analytics/class/${classDoc._id}`)
      .set("Authorization", `Bearer ${teacherAToken}`);

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.weakTopicCount).toBe(0);
    expect(data.weakTopicHotspots).toEqual([]);
    const conditionals = data.topicMasteryComparison.find((t) => t.topic === "Conditionals");
    expect(conditionals).toBeDefined();
    expect(conditionals.classAvg).toBe(50);
  });

  // CASE 7: Below threshold (Topic score = 49 IS weak)
  it("CASE 7 — Topic score 49% IS weak (< 50% rule)", async () => {
    const classDoc = await Class.create({
      name: "Below Threshold Cohort",
      teacherId: teacherA._id,
      students: [studentUser._id],
      languages: ["python"],
    });

    await Progress.create({
      studentId: studentUser._id,
      language: "python",
      topic: "Recursion",
      masteryScore: 49,
    });

    const res = await request(app)
      .get(`/api/analytics/class/${classDoc._id}`)
      .set("Authorization", `Bearer ${teacherAToken}`);

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.weakTopicCount).toBe(1);
    expect(data.weakTopicHotspots[0].topic).toBe("Recursion");
    expect(data.weakTopicHotspots[0].score).toBe(49);
  });

  // CASE 8: Teacher isolation (Teacher B cannot access Teacher A's class)
  it("CASE 8 — Teacher B is forbidden from accessing Teacher A's class analytics", async () => {
    const classDoc = await Class.create({
      name: "Teacher A Secret Class",
      teacherId: teacherA._id,
      students: [studentUser._id],
      languages: ["python"],
    });

    const res = await request(app)
      .get(`/api/analytics/class/${classDoc._id}`)
      .set("Authorization", `Bearer ${teacherBToken}`);

    expect(res.status).toBe(403);
  });

  // CASE 9: Class isolation (DSA class does not include other class data)
  it("CASE 9 — Class isolation strictly filters submissions by classId", async () => {
    const classDSA = await Class.create({
      name: "DSA Class",
      teacherId: teacherA._id,
      students: [studentUser._id],
      languages: ["python"],
    });

    const classWeb = await Class.create({
      name: "Web Dev Class",
      teacherId: teacherA._id,
      students: [studentUser._id],
      languages: ["javascript"],
    });

    const dsaAssignment = await Assignment.create({
      title: "Binary Search Tree",
      description: "Desc",
      language: "python",
      difficulty: "MEDIUM",
      classId: classDSA._id,
      createdBy: teacherA._id,
    });

    const webAssignment = await Assignment.create({
      title: "React Components",
      description: "Desc",
      language: "javascript",
      difficulty: "EASY",
      classId: classWeb._id,
      createdBy: teacherA._id,
    });

    // Student scored 90 in DSA and 20 in Web Dev
    await Submission.create({ assignmentId: dsaAssignment._id, userId: studentUser._id, code: "code", language: "python", status: "PASSED", score: 90, attemptNumber: 1 });
    await Submission.create({ assignmentId: webAssignment._id, userId: studentUser._id, code: "code", language: "javascript", status: "FAILED", score: 20, attemptNumber: 1 });

    const res = await request(app)
      .get(`/api/analytics/class/${classDSA._id}`)
      .set("Authorization", `Bearer ${teacherAToken}`);

    expect(res.status).toBe(200);
    const data = res.body.data;
    // Must ONLY reflect DSA score (90), not 20 from Web Dev
    expect(data.classAverage).toBe(90);
    expect(data.medianStudentScore).toBe(90);
    expect(data.assignmentCount).toBe(1);
    expect(data.submissionCount).toBe(1);
  });

  // CASE 10: New submission dynamically updates analytics
  it("CASE 10 — New submission dynamically changes class analytics", async () => {
    const classDoc = await Class.create({
      name: "Dynamic Cohort",
      teacherId: teacherA._id,
      students: [studentUser._id],
      languages: ["python"],
    });

    const assignment = await Assignment.create({
      title: "Dynamic Assignment",
      description: "Desc",
      language: "python",
      difficulty: "EASY",
      classId: classDoc._id,
      createdBy: teacherA._id,
    });

    // Initial submission = 50%
    await Submission.create({ assignmentId: assignment._id, userId: studentUser._id, code: "code", language: "python", status: "PASSED", score: 50, attemptNumber: 1 });

    const initialRes = await request(app)
      .get(`/api/analytics/class/${classDoc._id}`)
      .set("Authorization", `Bearer ${teacherAToken}`);
    expect(initialRes.body.data.classAverage).toBe(50);

    // New improved submission = 90% (best score becomes 90%)
    await Submission.create({ assignmentId: assignment._id, userId: studentUser._id, code: "code", language: "python", status: "PASSED", score: 90, attemptNumber: 2 });

    const updatedRes = await request(app)
      .get(`/api/analytics/class/${classDoc._id}`)
      .set("Authorization", `Bearer ${teacherAToken}`);
    expect(updatedRes.body.data.classAverage).toBe(90);
    expect(updatedRes.body.data.medianStudentScore).toBe(90);
  });
});
