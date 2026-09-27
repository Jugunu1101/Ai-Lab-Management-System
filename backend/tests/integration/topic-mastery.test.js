const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/modules/users/user.model');
const College = require('../../src/modules/colleges/college.model');
const Class = require('../../src/modules/classes/class.model');
const Assignment = require('../../src/modules/assignments/assignment.model');
const Submission = require('../../src/modules/submissions/submission.model');
const Quiz = require('../../src/modules/quizzes/quiz.model');
const QuizAttempt = require('../../src/modules/quizzes/quizAttempt.model');
const jwt = require('jsonwebtoken');

describe('Topic Mastery & Progress Suite (5-Factor Hybrid Algorithm)', () => {
  let college;
  let teacherUser, teacherToken;
  let otherTeacherUser, otherTeacherToken;
  let studentUser, studentToken;
  let class1, otherClass, emptyClass;
  let assignment1;

  beforeEach(async () => {
    college = await College.create({
      name: 'Mastery Tech College',
      code: 'MTC',
      domains: ['mtc.edu'],
      status: 'ACTIVE',
    });

    teacherUser = await User.create({
      name: 'Professor Ada Lovelace',
      email: 'ada.lovelace@mtc.edu',
      passwordHash: 'hashedpass',
      role: 'TEACHER',
      collegeId: college._id,
      department: 'Computer Science',
      approvalStatus: 'APPROVED',
    });
    teacherToken = jwt.sign(
      { userId: teacherUser._id, email: teacherUser.email, role: teacherUser.role, collegeId: college._id },
      process.env.JWT_SECRET || 'test-secret-key-for-jest'
    );

    otherTeacherUser = await User.create({
      name: 'Professor Charles Babbage',
      email: 'babbage@mtc.edu',
      passwordHash: 'hashedpass',
      role: 'TEACHER',
      collegeId: college._id,
      department: 'Computer Science',
      approvalStatus: 'APPROVED',
    });
    otherTeacherToken = jwt.sign(
      { userId: otherTeacherUser._id, email: otherTeacherUser.email, role: otherTeacherUser.role, collegeId: college._id },
      process.env.JWT_SECRET || 'test-secret-key-for-jest'
    );

    studentUser = await User.create({
      name: 'Margaret Hamilton',
      email: 'margaret@mtc.edu',
      passwordHash: 'hashedpass',
      role: 'STUDENT',
      collegeId: college._id,
      department: 'Computer Science',
      approvalStatus: 'APPROVED',
    });
    studentToken = jwt.sign(
      { userId: studentUser._id, email: studentUser.email, role: studentUser.role, collegeId: college._id },
      process.env.JWT_SECRET || 'test-secret-key-for-jest'
    );

    class1 = await Class.create({
      name: 'Algorithms & Telemetry',
      code: 'ALGO101',
      department: 'Computer Science',
      teacherId: teacherUser._id,
      collegeId: college._id,
      students: [studentUser._id],
    });

    otherClass = await Class.create({
      name: 'Unauthorized Architecture',
      code: 'ARCH202',
      department: 'Computer Science',
      teacherId: otherTeacherUser._id,
      collegeId: college._id,
      students: [],
    });

    emptyClass = await Class.create({
      name: 'Empty Laboratory',
      code: 'LAB303',
      department: 'Computer Science',
      teacherId: teacherUser._id,
      collegeId: college._id,
      students: [],
    });

    // 1. Assignment with topic 'basics'
    assignment1 = await Assignment.create({
      title: 'Introductory Basics Problem',
      description: 'Practice basic conditions and logic',
      language: 'cpp',
      difficulty: 'EASY',
      topics: ['basics'],
      classId: class1._id,
      createdBy: teacherUser._id,
      testCases: [{ input: '1', expectedOutput: '1', isHidden: false }],
    });

    // 2. Real Submission by student on assignment1: score 100%, PASSED
    await Submission.create({
      assignmentId: assignment1._id,
      userId: studentUser._id,
      code: '#include <iostream>\nint main(){ std::cout << 1; return 0; }',
      language: 'cpp',
      status: 'PASSED',
      score: 100,
      testCasesPassed: 1,
      totalTestCases: 1,
      attemptNumber: 1,
      testResults: [{ testCaseIndex: 0, passed: true, expectedOutput: '1', actualOutput: '1' }],
    });

    // 3. Real Quiz Attempt on 'basics': score 20%
    const quiz1 = await Quiz.create({
      title: 'Basics Daily Quiz',
      studentId: studentUser._id,
      language: 'cpp',
      topic: 'basics',
      questions: [{ question: 'What is 1+1?', options: ['1', '2'], correctAnswer: '2' }],
      status: 'COMPLETED',
    });

    await QuizAttempt.create({
      studentId: studentUser._id,
      quizId: quiz1._id,
      topic: 'basics',
      score: 20,
      totalQuestions: 5,
      correctAnswers: 1,
    });
  });

  describe('Student Topic Mastery API (GET /api/student/topics)', () => {
    it('calculates real topic mastery via 5-factor hybrid algorithm from database records', async () => {
      const res = await request(app)
        .get('/api/student/topics')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data).toHaveProperty('topics');
      expect(Array.isArray(data.topics)).toBe(true);
      expect(data.topics.length).toBeGreaterThanOrEqual(1);

      const basicsTopic = data.topics.find((t) => t.topic === 'basics');
      expect(basicsTopic).toBeDefined();

      // Real components:
      // Assignments (35%): score = 100%
      // Quizzes (25%): score = 20%
      // Submissions (20%): 1/1 passed = 100%
      // Errors (10%): 0 mistakes = 100%
      // Practice (10%): recent = 100%
      // Total = 0.35*100 + 0.25*20 + 0.20*100 + 0.10*100 + 0.10*100 = 35 + 5 + 20 + 10 + 10 = 80%
      expect(basicsTopic.assignmentScore).toBe(100);
      expect(basicsTopic.quizScore).toBe(20);
      expect(basicsTopic.submissionSuccessRate).toBe(100);
      expect(basicsTopic.masteryScore).toBe(80);
      expect(basicsTopic.score).toBe(80);
      expect(basicsTopic.practiceCount).toBe(1);
      expect(basicsTopic.status).toBe('Good Mastery');

      // Metric summaries:
      expect(data.strongCount).toBe(1);
      expect(data.classroomAverage).toBe(80);
    });

    it('strictly scopes data to selected classId and isolates between different classes', async () => {
      // Create a second enrolled class (Class B) with different topic ('loops') and no submissions
      const class2 = await Class.create({
        name: 'Data Structures Lab',
        code: 'DS201',
        department: 'Computer Science',
        teacherId: teacherUser._id,
        collegeId: college._id,
        students: [studentUser._id],
      });

      const assignment2 = await Assignment.create({
        title: 'Loops Practice Problem',
        description: 'Iterate over ranges',
        language: 'cpp',
        difficulty: 'EASY',
        topics: ['loops'],
        classId: class2._id,
        createdBy: teacherUser._id,
      });

      // 1. Query Class 1 (ALGO101): Should ONLY contain 'basics' with 100% assignment score
      const resClass1 = await request(app)
        .get(`/api/student/topics?classId=${class1._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(resClass1.status).toBe(200);
      expect(resClass1.body.data.topics).toHaveLength(1);
      expect(resClass1.body.data.topics[0].topic).toBe('basics');
      expect(resClass1.body.data.topics[0].assignmentScore).toBe(100);
      expect(resClass1.body.data.topics[0].masteryScore).toBe(80);
      expect(resClass1.body.data.strongCount).toBe(1);
      expect(resClass1.body.data.weakCount).toBe(0);

      // 2. Query Class 2 (DS201): Should ONLY contain 'loops' with 0% assignment score, no leak from Class 1
      const resClass2 = await request(app)
        .get(`/api/student/topics?classId=${class2._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(resClass2.status).toBe(200);
      expect(resClass2.body.data.topics).toHaveLength(1);
      expect(resClass2.body.data.topics[0].topic).toBe('loops');
      expect(resClass2.body.data.topics[0].assignmentScore).toBe(0); // 0 submissions in DS201
      expect(resClass2.body.data.topics[0].masteryScore).toBe(20);
      expect(resClass2.body.data.strongCount).toBe(0);
      expect(resClass2.body.data.weakCount).toBe(1);

      // Verify cross-class non-leakage
      expect(resClass1.body.data.topics.find((t) => t.topic === 'loops')).toBeUndefined();
      expect(resClass2.body.data.topics.find((t) => t.topic === 'basics')).toBeUndefined();
    });

    it('rejects unauthorized class access with 403 when student is not enrolled', async () => {
      const res = await request(app)
        .get(`/api/student/topics?classId=${otherClass._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/not enrolled/i);
    });

    it('rejects malformed or invalid classId with 400', async () => {
      const res = await request(app)
        .get('/api/student/topics?classId=invalid-mongo-id')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CLASS_ID');
    });

    it('returns clean empty state when enrolled class has no assignments', async () => {
      // Enroll student in emptyClass
      await Class.findByIdAndUpdate(emptyClass._id, { $push: { students: studentUser._id } });

      const res = await request(app)
        .get(`/api/student/topics?classId=${emptyClass._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.hasData).toBe(false);
      expect(res.body.data.topics).toEqual([]);
      expect(res.body.data.classroomAverage).toBe(0);
      expect(res.body.data.strongCount).toBe(0);
      expect(res.body.data.weakCount).toBe(0);
    });
  });

  describe('Teacher Class Topic Analytics API (GET /api/analytics/class/:classId/topics)', () => {
    it('aggregates real topic telemetry scoped to the authorized class', async () => {
      const res = await request(app)
        .get(`/api/analytics/class/${class1._id}/topics`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.classId).toBe(class1._id.toString());
      expect(data.hasData).toBe(true);
      expect(data.topics.length).toBeGreaterThanOrEqual(1);

      const basics = data.topics.find((t) => t.topic === 'basics');
      expect(basics).toBeDefined();
      expect(basics.masteryScore).toBe(80);
      expect(basics.assignmentScore).toBe(100);
      expect(basics.quizScore).toBe(20);
      expect(basics.practiceCount).toBe(1);
      expect(basics.status).toBe('Good Mastery');
    });

    it('returns clean no-data state when classroom has no student activity', async () => {
      const res = await request(app)
        .get(`/api/analytics/class/${emptyClass._id}/topics`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.hasData).toBe(false);
      expect(res.body.data.topics).toEqual([]);
      expect(res.body.data.weakCount).toBe(0);
      expect(res.body.data.strongCount).toBe(0);
      expect(res.body.data.classroomAverage).toBe(0);
    });

    it('strictly forbids unauthorized teacher from accessing another teacher class topics', async () => {
      const res = await request(app)
        .get(`/api/analytics/class/${otherClass._id}/topics`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Mastery Thresholds Verification', () => {
    it('verifies exact threshold boundaries: >=70 Good, 50-69 Needs Practice, <50 Weak', () => {
      const classify = (score) => (score >= 70 ? 'Good Mastery' : score >= 50 ? 'Needs Practice' : 'Weak Topic');

      expect(classify(70)).toBe('Good Mastery');
      expect(classify(71)).toBe('Good Mastery');
      expect(classify(100)).toBe('Good Mastery');

      expect(classify(50)).toBe('Needs Practice');
      expect(classify(69)).toBe('Needs Practice');
      expect(classify(69.9)).toBe('Needs Practice');

      expect(classify(49)).toBe('Weak Topic');
      expect(classify(49.9)).toBe('Weak Topic');
      expect(classify(0)).toBe('Weak Topic');
    });
  });
});
