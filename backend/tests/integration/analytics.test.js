const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/modules/users/user.model');
const College = require('../../src/modules/colleges/college.model');
const Class = require('../../src/modules/classes/class.model');
const jwt = require('jsonwebtoken');

describe('Analytics API', () => {
  let college;
  let teacherToken;
  let teacherUser;
  let studentToken;
  let studentUser;
  let classDoc;

  beforeEach(async () => {
    college = await College.create({
      name: 'Data Tech College',
      code: 'DTC',
      domains: ['datatech.edu'],
      status: 'ACTIVE',
    });

    teacherUser = await User.create({
      name: 'Prof. Analytics',
      email: 'prof@datatech.edu',
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
      name: 'Data Student',
      email: 'student@datatech.edu',
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
      name: 'Big Data 101',
      code: 'BD101',
      teacherId: teacherUser._id,
      collegeId: college._id,
      students: [studentUser._id],
    });
  });

  it('fetches student analytics for student user', async () => {
    const res = await request(app)
      .get('/api/analytics/student')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data).toHaveProperty('totalAssignments');
  });

  it('allows teacher to fetch specific student analytics', async () => {
    const res = await request(app)
      .get(`/api/analytics/student/${studentUser._id}`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data).toHaveProperty('totalAssignments');
  });

  it('allows teacher to fetch class analytics', async () => {
    const res = await request(app)
      .get(`/api/analytics/class/${classDoc._id}`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data).toHaveProperty('studentCount', 1);
  });

  it('allows teacher to fetch teacher-dashboard with real at-risk students (<45% mastery)', async () => {
    const Progress = require('../../src/modules/progress/progress.model');
    await Progress.create({
      studentId: studentUser._id,
      language: 'javascript',
      topic: 'arrays',
      masteryScore: 42,
    });

    const res = await request(app)
      .get('/api/analytics/teacher-dashboard')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.totalStudents).toBe(1);
    expect(res.body.data.atRiskStudents).toHaveLength(1);
    expect(res.body.data.atRiskStudents[0].score).toBe(42);
    expect(res.body.data.atRiskStudents[0].reason).toContain('Mastery is below the 45% attention threshold');
  });

  it('does not flag student when mastery is 45% or above', async () => {
    const Progress = require('../../src/modules/progress/progress.model');
    await Progress.create({
      studentId: studentUser._id,
      language: 'javascript',
      topic: 'arrays',
      masteryScore: 45,
    });

    const res = await request(app)
      .get('/api/analytics/teacher-dashboard')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.atRiskStudents).toHaveLength(0);
  });

  it('rejects student attempting to access teacher-dashboard (security)', async () => {
    const res = await request(app)
      .get('/api/analytics/teacher-dashboard')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });
});

