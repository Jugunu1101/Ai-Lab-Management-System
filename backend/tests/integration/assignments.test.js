const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/modules/users/user.model');
const College = require('../../src/modules/colleges/college.model');
const Class = require('../../src/modules/classes/class.model');
const Assignment = require('../../src/modules/assignments/assignment.model');
const jwt = require('jsonwebtoken');

describe('Assignments API', () => {
  let college;
  let teacherToken;
  let teacherUser;
  let studentToken;
  let studentUser;
  let classDoc;

  beforeEach(async () => {
    college = await College.create({
      name: 'Computer Science College',
      code: 'CSC',
      domains: ['csc.edu'],
      status: 'ACTIVE',
    });

    teacherUser = await User.create({
      name: 'Prof. Turing',
      email: 'turing@csc.edu',
      passwordHash: 'hashedpassword',
      role: 'TEACHER',
      collegeId: college._id,
      approvalStatus: 'APPROVED',
    });
    teacherToken = jwt.sign(
      { userId: teacherUser._id, email: teacherUser.email, role: teacherUser.role, collegeId: college._id },
      process.env.JWT_SECRET || 'test-secret-key-for-jest'
    );

    studentUser = await User.create({
      name: 'Bob Student',
      email: 'bob@csc.edu',
      passwordHash: 'hashedpassword',
      role: 'STUDENT',
      collegeId: college._id,
      approvalStatus: 'APPROVED',
    });
    studentToken = jwt.sign(
      { userId: studentUser._id, email: studentUser.email, role: studentUser.role, collegeId: college._id },
      process.env.JWT_SECRET || 'test-secret-key-for-jest'
    );

    classDoc = await Class.create({
      name: 'CS101 Intro to Python',
      code: 'CS101',
      teacherId: teacherUser._id,
      collegeId: college._id,
      students: [studentUser._id],
    });
  });

  it('allows teacher to create an assignment with public and hidden test cases', async () => {
    const res = await request(app)
      .post('/api/assignments')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'Two Sum Problem',
        description: 'Find two indices that sum up to target',
        language: 'python',
        difficulty: 'EASY',
        topics: ['arrays', 'hashmaps'],
        classId: classDoc._id.toString(),
        testCases: [
          { input: '[2,7,11,15]\n9', expectedOutput: '[0,1]', isHidden: false },
          { input: '[3,2,4]\n6', expectedOutput: '[1,2]', isHidden: true },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('title', 'Two Sum Problem');
    expect(res.body.data.testCases).toHaveLength(2);
  });

  it('masks hidden test cases when a student fetches assignment details', async () => {
    const assignment = await Assignment.create({
      title: 'Reverse String',
      description: 'Reverse the input string',
      language: 'javascript',
      difficulty: 'EASY',
      topics: ['strings'],
      classId: classDoc._id,
      createdBy: teacherUser._id,
      testCases: [
        { input: 'hello', expectedOutput: 'olleh', isHidden: false },
        { input: 'world', expectedOutput: 'dlrow', isHidden: true },
      ],
    });

    const res = await request(app)
      .get(`/api/assignments/${assignment._id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Student should only see public test cases
    expect(res.body.data.testCases).toHaveLength(1);
    expect(res.body.data.testCases[0].input).toBe('hello');
  });

  it('lists assignments for a class', async () => {
    await Assignment.create({
      title: 'Assignment 1',
      description: 'Desc 1',
      language: 'python',
      difficulty: 'MEDIUM',
      classId: classDoc._id,
      createdBy: teacherUser._id,
      testCases: [{ input: '1', expectedOutput: '1', isHidden: false }],
    });

    const res = await request(app)
      .get(`/api/assignments?classId=${classDoc._id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });
});
