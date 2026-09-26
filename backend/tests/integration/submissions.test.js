const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/modules/users/user.model');
const College = require('../../src/modules/colleges/college.model');
const Class = require('../../src/modules/classes/class.model');
const Assignment = require('../../src/modules/assignments/assignment.model');
const Submission = require('../../src/modules/submissions/submission.model');
const jwt = require('jsonwebtoken');

describe('Submissions API', () => {
  let college;
  let teacherToken;
  let teacherUser;
  let studentToken;
  let studentUser;
  let classDoc;
  let assignmentDoc;

  beforeEach(async () => {
    college = await College.create({
      name: 'Polytechnic University',
      code: 'PU',
      domains: ['poly.edu'],
      status: 'ACTIVE',
    });

    teacherUser = await User.create({
      name: 'Prof. Hopper',
      email: 'hopper@poly.edu',
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
      name: 'Grace Student',
      email: 'grace@poly.edu',
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
      name: 'Compiler Design',
      code: 'CD401',
      teacherId: teacherUser._id,
      collegeId: college._id,
      students: [studentUser._id],
    });

    assignmentDoc = await Assignment.create({
      title: 'Parser Implementation',
      description: 'Implement a recursive descent parser',
      language: 'python',
      difficulty: 'HARD',
      topics: ['parsing', 'trees'],
      classId: classDoc._id,
      createdBy: teacherUser._id,
      testCases: [
        { input: '1 + 2', expectedOutput: '3', isHidden: false },
        { input: '4 * 5 + 6', expectedOutput: '26', isHidden: true },
      ],
    });
  });

  it('allows student to submit code for an assignment', async () => {
    const res = await request(app)
      .post('/api/submissions')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        assignmentId: assignmentDoc._id.toString(),
        code: 'print(eval(input()))',
        language: 'python',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('_id');
    expect(res.body.data.status).toBeDefined();
  });

  it('allows teacher to get submissions by student ID', async () => {
    await Submission.create({
      assignmentId: assignmentDoc._id,
      userId: studentUser._id,
      attemptNumber: 1,
      code: 'print("hello")',
      language: 'python',
      status: 'PASSED',
      score: 100,
    });

    const res = await request(app)
      .get(`/api/submissions/student/${studentUser._id}`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('allows student to view their own submission history', async () => {
    await Submission.create({
      assignmentId: assignmentDoc._id,
      userId: studentUser._id,
      attemptNumber: 1,
      code: 'print("hello")',
      language: 'python',
      status: 'PASSED',
      score: 100,
    });

    const res = await request(app)
      .get('/api/submissions')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('strictly isolates submissions: Assignment B must not return Assignment A submissions', async () => {
    // 1. Create Assignment A: factorial
    const factorialAssignment = await Assignment.create({
      title: 'Create a factorial program',
      description: 'Calculate factorial of n',
      language: 'cpp',
      starterCode: '// Factorial starter code',
      difficulty: 'EASY',
      topics: ['math', 'recursion'],
      classId: classDoc._id,
      createdBy: teacherUser._id,
      testCases: [{ input: '5', expectedOutput: '120', isHidden: false }],
    });

    // 2. Create Assignment B: binary
    const binaryAssignment = await Assignment.create({
      title: 'binary',
      description: 'Implement binary search',
      language: 'cpp',
      starterCode: '// Binary search starter code',
      difficulty: 'MEDIUM',
      topics: ['algorithms', 'search'],
      classId: classDoc._id,
      createdBy: teacherUser._id,
      testCases: [{ input: '1,2,3,4,5\n3', expectedOutput: '2', isHidden: false }],
    });

    // 3. Create successful submission ONLY for Assignment A (Factorial)
    const factorialCode = '#include <iostream>\nusing namespace std;\nint main() { int fact=120; cout<<fact; return 0; }';
    await Submission.create({
      assignmentId: factorialAssignment._id,
      userId: studentUser._id,
      attemptNumber: 1,
      code: factorialCode,
      language: 'cpp',
      status: 'PASSED',
      score: 100,
    });

    // 4. Query submissions specifically for Assignment A
    const resA = await request(app)
      .get(`/api/submissions?assignmentId=${factorialAssignment._id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(resA.status).toBe(200);
    expect(resA.body.success).toBe(true);
    expect(resA.body.data.length).toBe(1);
    expect(resA.body.data[0].score).toBe(100);
    expect(resA.body.data[0].status).toBe('PASSED');
    expect(resA.body.data[0].code).toBe(factorialCode);

    // 5. Query submissions specifically for Assignment B (must be EMPTY)
    const resB = await request(app)
      .get(`/api/submissions?assignmentId=${binaryAssignment._id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(resB.status).toBe(200);
    expect(resB.body.success).toBe(true);
    expect(resB.body.data.length).toBe(0);
    // Crucial: Assignment B response MUST NOT contain Assignment A code or submission
    expect(JSON.stringify(resB.body.data)).not.toContain(factorialCode);
    expect(JSON.stringify(resB.body.data)).not.toContain('Create a factorial program');

    // 6. Verify Assignment B details retain their own starter code
    const assignBRes = await request(app)
      .get(`/api/assignments/${binaryAssignment._id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(assignBRes.status).toBe(200);
    expect(assignBRes.body.data.starterCode).toBe('// Binary search starter code');

    // 7. Verify Assignment list computes correct individual status for student
    const listRes = await request(app)
      .get('/api/assignments')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(listRes.status).toBe(200);
    const itemA = listRes.body.data.find(a => a._id.toString() === factorialAssignment._id.toString());
    const itemB = listRes.body.data.find(a => a._id.toString() === binaryAssignment._id.toString());

    expect(itemA.status).toBe('COMPLETED');
    expect(itemA.score).toBe(100);
    expect(itemA.attempts).toBe(1);

    expect(itemB.status).toBe('NOT_STARTED');
    expect(itemB.score).toBe(0);
    expect(itemB.attempts).toBe(0);
  });
});
