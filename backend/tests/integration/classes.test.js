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

  it('lists all enrolled classes for student across multiple instructors', async () => {
    const teacher2 = await User.create({
      name: 'Professor Davis',
      email: 'davis@ei.edu',
      passwordHash: 'hashedpassword',
      role: 'TEACHER',
      collegeId: college._id,
      approvalStatus: 'APPROVED',
    });

    const class1 = await Class.create({
      name: 'Class One (Teacher Smith)',
      code: 'CLS101',
      teacherId: teacherUser._id,
      collegeId: college._id,
      students: [studentUser._id],
    });

    const class2 = await Class.create({
      name: 'Class Two (Teacher Davis)',
      code: 'CLS202',
      teacherId: teacher2._id,
      collegeId: college._id,
      students: [studentUser._id],
    });

    const unEnrolledClass = await Class.create({
      name: 'Class Three (Unenrolled)',
      code: 'CLS303',
      teacherId: teacherUser._id,
      collegeId: college._id,
      students: [],
    });

    const res = await request(app)
      .get('/api/classes')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const returnedClassIds = res.body.data.map((c) => c._id.toString());
    expect(returnedClassIds).toContain(class1._id.toString());
    expect(returnedClassIds).toContain(class2._id.toString());
    expect(returnedClassIds).not.toContain(unEnrolledClass._id.toString());
  });

  it('A & B. Returns all 3 enrolled classes for student across multiple instructors', async () => {
    const teacher2 = await User.create({
      name: 'Professor Davis',
      email: 'davis2@ei.edu',
      passwordHash: 'hashedpassword',
      role: 'TEACHER',
      collegeId: college._id,
      approvalStatus: 'APPROVED',
    });

    const teacher3 = await User.create({
      name: 'Professor Johnson',
      email: 'johnson@ei.edu',
      passwordHash: 'hashedpassword',
      role: 'TEACHER',
      collegeId: college._id,
      approvalStatus: 'APPROVED',
    });

    const c1 = await Class.create({
      name: 'Course A',
      code: 'CRS101',
      teacherId: teacherUser._id,
      collegeId: college._id,
      students: [studentUser._id],
    });
    const c2 = await Class.create({
      name: 'Course B',
      code: 'CRS102',
      teacherId: teacher2._id,
      collegeId: college._id,
      students: [studentUser._id],
    });
    const c3 = await Class.create({
      name: 'Course C',
      code: 'CRS103',
      teacherId: teacher3._id,
      collegeId: college._id,
      students: [studentUser._id],
    });

    const res = await request(app)
      .get('/api/classes')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(3);
    const returnedIds = res.body.data.map((c) => c._id.toString());
    expect(returnedIds).toContain(c1._id.toString());
    expect(returnedIds).toContain(c2._id.toString());
    expect(returnedIds).toContain(c3._id.toString());
  });

  it('C & G. Student with 0 enrolled classes receives empty list', async () => {
    const newStudent = await User.create({
      name: 'Bob Student',
      email: 'bob@ei.edu',
      passwordHash: 'hashedpassword',
      role: 'STUDENT',
      collegeId: college._id,
      approvalStatus: 'APPROVED',
    });
    const newStudentToken = jwt.sign(
      { userId: newStudent._id, email: newStudent.email, role: newStudent.role, collegeId: college._id },
      process.env.JWT_SECRET || 'test-secret-key-for-jest'
    );

    const res = await request(app)
      .get('/api/classes')
      .set('Authorization', `Bearer ${newStudentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  it('D & E. Instructor sees only owned classes and cannot access another instructor class', async () => {
    const teacherB = await User.create({
      name: 'Teacher B',
      email: 'teacherB@ei.edu',
      passwordHash: 'hashedpassword',
      role: 'TEACHER',
      collegeId: college._id,
      approvalStatus: 'APPROVED',
    });
    const teacherBToken = jwt.sign(
      { userId: teacherB._id, email: teacherB.email, role: teacherB.role, collegeId: college._id },
      process.env.JWT_SECRET || 'test-secret-key-for-jest'
    );

    const classA1 = await Class.create({
      name: 'Teacher A Class 1',
      code: 'TAC101',
      teacherId: teacherUser._id,
      collegeId: college._id,
      students: [],
    });
    const classA2 = await Class.create({
      name: 'Teacher A Class 2',
      code: 'TAC102',
      teacherId: teacherUser._id,
      collegeId: college._id,
      students: [],
    });
    const classB1 = await Class.create({
      name: 'Teacher B Class 1',
      code: 'TBC101',
      teacherId: teacherB._id,
      collegeId: college._id,
      students: [],
    });

    // Teacher A lists classes -> expects only 2 classes owned by Teacher A
    const resA = await request(app)
      .get('/api/classes')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(resA.status).toBe(200);
    expect(resA.body.data.length).toBe(2);
    const idsA = resA.body.data.map((c) => c._id.toString());
    expect(idsA).toContain(classA1._id.toString());
    expect(idsA).toContain(classA2._id.toString());
    expect(idsA).not.toContain(classB1._id.toString());

    // Teacher A tries to view/access Teacher B's class details -> expects 403 FORBIDDEN
    const resGetB = await request(app)
      .get(`/api/classes/${classB1._id}`)
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(resGetB.status).toBe(403);
  });

  it('F. Admin can access all classes', async () => {
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@ei.edu',
      passwordHash: 'hashedpassword',
      role: 'ADMIN',
      collegeId: college._id,
      approvalStatus: 'APPROVED',
    });
    const adminToken = jwt.sign(
      { userId: adminUser._id, email: adminUser.email, role: adminUser.role, collegeId: college._id },
      process.env.JWT_SECRET || 'test-secret-key-for-jest'
    );

    await Class.create({
      name: 'Class Admin Check 1',
      code: 'ADM101',
      teacherId: teacherUser._id,
      collegeId: college._id,
      students: [],
    });

    const res = await request(app)
      .get('/api/classes')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });
});

