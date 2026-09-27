const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/modules/users/user.model');
const College = require('../../src/modules/colleges/college.model');
const Class = require('../../src/modules/classes/class.model');
const Assignment = require('../../src/modules/assignments/assignment.model');
const jwt = require('jsonwebtoken');

describe('Search Functionality Integration Audit', () => {
  let college;
  let teacherUser, teacherToken;
  let otherTeacherUser, otherTeacherToken;
  let studentUser, studentToken;
  let adminUser, adminToken;
  let class1, class2, otherClass;
  let assignment1, assignment2;

  beforeEach(async () => {
    college = await College.create({
      name: 'Search Tech Institute',
      code: 'STI',
      domains: ['sti.edu'],
      status: 'ACTIVE',
    });

    teacherUser = await User.create({
      name: 'Prof. Donald Knuth',
      email: 'knuth@sti.edu',
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
      name: 'Prof. Dennis Ritchie',
      email: 'ritchie@sti.edu',
      passwordHash: 'hashedpass',
      role: 'TEACHER',
      collegeId: college._id,
      department: 'Electrical Engineering',
      approvalStatus: 'APPROVED',
    });
    otherTeacherToken = jwt.sign(
      { userId: otherTeacherUser._id, email: otherTeacherUser.email, role: otherTeacherUser.role, collegeId: college._id },
      process.env.JWT_SECRET || 'test-secret-key-for-jest'
    );

    studentUser = await User.create({
      name: 'Linus Torvalds',
      email: 'linus@sti.edu',
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

    adminUser = await User.create({
      name: 'Campus Administrator',
      email: 'admin@sti.edu',
      passwordHash: 'hashedpass',
      role: 'ADMIN',
      collegeId: college._id,
      department: 'Administration',
      approvalStatus: 'APPROVED',
    });
    adminToken = jwt.sign(
      { userId: adminUser._id, email: adminUser.email, role: adminUser.role, collegeId: college._id },
      process.env.JWT_SECRET || 'test-secret-key-for-jest'
    );

    // Classes
    class1 = await Class.create({
      name: 'Algorithms & Data Structures',
      code: 'CS101',
      department: 'Computer Science',
      teacherId: teacherUser._id,
      collegeId: college._id,
      students: [studentUser._id],
    });

    class2 = await Class.create({
      name: 'Compiler Architecture',
      code: 'COMP400',
      department: 'Computer Science',
      teacherId: teacherUser._id,
      collegeId: college._id,
      students: [],
    });

    otherClass = await Class.create({
      name: 'Microprocessors and Circuits',
      code: 'EE200',
      department: 'Electrical Engineering',
      teacherId: otherTeacherUser._id,
      collegeId: college._id,
      students: [],
    });

    // Assignments
    assignment1 = await Assignment.create({
      title: 'Quicksort and Partitioning',
      description: 'Implement Lomuto and Hoare partition schemes',
      classId: class1._id,
      createdBy: teacherUser._id,
      difficulty: 'MEDIUM',
      language: 'cpp',
      topics: ['sorting', 'divide-and-conquer'],
      testCases: [{ input: '5', expectedOutput: '5', isHidden: false }],
      dueDate: new Date(Date.now() + 86400000),
    });

    assignment2 = await Assignment.create({
      title: 'Lexical Analysis with DFA',
      description: 'Build a finite automaton in Python',
      classId: class2._id,
      createdBy: teacherUser._id,
      difficulty: 'HARD',
      language: 'python',
      topics: ['compilers', 'automata'],
      testCases: [{ input: 'x = 1', expectedOutput: 'IDENTIFIER', isHidden: false }],
      dueDate: new Date(Date.now() + 86400000),
    });
  });

  describe('Classes Search API (GET /api/classes)', () => {
    it('searches teacher classes by code or name case-insensitively with spaces', async () => {
      const res = await request(app)
        .get('/api/classes?search=%20%20cs101%20%20')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('Algorithms & Data Structures');
    });

    it('strictly maintains teacher scoping - cannot search classes of other teachers', async () => {
      const res = await request(app)
        .get('/api/classes?search=Circuits')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      // teacherUser should not see otherTeacher's class
      expect(res.body.data.length).toBe(0);
    });

    it('allows student to search only enrolled classes', async () => {
      // Student is enrolled in CS101, but not COMP400
      const resEnrolled = await request(app)
        .get('/api/classes?search=Algorithms')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(resEnrolled.status).toBe(200);
      expect(resEnrolled.body.success).toBe(true);
      expect(resEnrolled.body.data.length).toBe(1);
      expect(resEnrolled.body.data[0].code).toBe('CS101');

      const resNotEnrolled = await request(app)
        .get('/api/classes?search=Compiler')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(resNotEnrolled.status).toBe(200);
      expect(resNotEnrolled.body.data.length).toBe(0);
    });
  });

  describe('Assignments Search API (GET /api/assignments)', () => {
    it('searches assignments by title, topic, or description case-insensitively', async () => {
      const res = await request(app)
        .get('/api/assignments?search=%20%20QUICKSORT%20%20')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe('Quicksort and Partitioning');
    });

    it('searches assignments by topic tag', async () => {
      const res = await request(app)
        .get('/api/assignments?topic=automata')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe('Lexical Analysis with DFA');
    });

    it('strictly maintains student scoping - student only searches assignments for enrolled classes', async () => {
      // Student is enrolled in class1 (Quicksort), NOT class2 (Lexical Analysis)
      const res1 = await request(app)
        .get('/api/assignments?search=Quicksort')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res1.status).toBe(200);
      expect(res1.body.data.length).toBe(1);

      const res2 = await request(app)
        .get('/api/assignments?search=Lexical')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res2.status).toBe(200);
      expect(res2.body.data.length).toBe(0);
    });
  });

  describe('Admin Users Search API (GET /api/admin/users)', () => {
    it('filters users by department, name, and handles regex characters safely', async () => {
      const res = await request(app)
        .get('/api/admin/users?search=Knuth')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.users.some((u) => u.name === 'Prof. Donald Knuth')).toBe(true);

      // Safe against special regex characters
      const regexRes = await request(app)
        .get('/api/admin/users?search=.*+?')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(regexRes.status).toBe(200);
      expect(regexRes.body.data.users.length).toBe(0);
    });
  });
});
