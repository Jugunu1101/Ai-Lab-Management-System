const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/modules/users/user.model');
const College = require('../../src/modules/colleges/college.model');
const Class = require('../../src/modules/classes/class.model');
const jwt = require('jsonwebtoken');

describe('Classes API', () => {
  let college;
  let teacherToken;
  let teacherUser;
  let studentToken;
  let studentUser;

  beforeEach(async () => {
    college = await College.create({
      name: 'Engineering Institute',
      code: 'EI',
      domains: ['ei.edu'],
      status: 'ACTIVE',
    });

    teacherUser = await User.create({
      name: 'Professor Smith',
      email: 'smith@ei.edu',
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
      name: 'Alice Student',
      email: 'alice@ei.edu',
      passwordHash: 'hashedpassword',
      role: 'STUDENT',
      collegeId: college._id,
      approvalStatus: 'APPROVED',
    });
    studentToken = jwt.sign(
      { userId: studentUser._id, email: studentUser.email, role: studentUser.role, collegeId: college._id },
      process.env.JWT_SECRET || 'test-secret-key-for-jest'
    );
  });

  it('allows teacher to create a new class', async () => {
    const res = await request(app)
      .post('/api/classes')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        name: 'Data Structures 101',
        description: 'Introduction to data structures in C++',
        academicYear: '2026-2027',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('name', 'Data Structures 101');
    expect(res.body.data).toHaveProperty('code');
  });

  it('allows student to join class using class code', async () => {
    const classDoc = await Class.create({
      name: 'Algorithms 201',
      code: 'ALG201',
      teacherId: teacherUser._id,
      collegeId: college._id,
      students: [],
    });

    const res = await request(app)
      .post('/api/classes/join')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        code: 'ALG201',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updated = await Class.findById(classDoc._id);
    expect(updated.students.map((s) => s.toString())).toContain(studentUser._id.toString());
  });

  it('fetches class details for enrolled student or teacher', async () => {
    const classDoc = await Class.create({
      name: 'Operating Systems',
      code: 'OS301',
      teacherId: teacherUser._id,
      collegeId: college._id,
      students: [studentUser._id],
    });

    const res = await request(app)
      .get(`/api/classes/${classDoc._id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('name', 'Operating Systems');
  });
});
