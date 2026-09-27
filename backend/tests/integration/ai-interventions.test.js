const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/modules/users/user.model');
const College = require('../../src/modules/colleges/college.model');
const Class = require('../../src/modules/classes/class.model');
const Progress = require('../../src/modules/progress/progress.model');
const AIIntervention = require('../../src/modules/ai/aiIntervention.model');
const { recordIntervention, getTeacherInterventions } = require('../../src/modules/ai/aiIntervention.service');
const jwt = require('jsonwebtoken');

describe('AI Learning Interventions API & Service', () => {
  let college;
  let teacherA;
  let teacherB;
  let studentA;
  let studentB;
  let classA;
  let classB;
  let teacherTokenA;
  let teacherTokenB;
  let studentTokenA;

  beforeEach(async () => {
    college = await College.create({
      name: 'Interventions College',
      code: 'IVC',
      domains: ['ivc.edu'],
      status: 'ACTIVE',
    });

    teacherA = await User.create({
      name: 'Instructor Alpha',
      email: 'teacher.alpha@ivc.edu',
      passwordHash: 'hash',
      role: 'TEACHER',
      collegeId: college._id,
      approvalStatus: 'APPROVED',
    });
    teacherTokenA = jwt.sign(
      { userId: teacherA._id, email: teacherA.email, role: teacherA.role, collegeId: college._id },
      process.env.JWT_SECRET || 'test-secret-key-for-jest'
    );

    teacherB = await User.create({
      name: 'Instructor Beta',
      email: 'teacher.beta@ivc.edu',
      passwordHash: 'hash',
      role: 'TEACHER',
      collegeId: college._id,
      approvalStatus: 'APPROVED',
    });
    teacherTokenB = jwt.sign(
      { userId: teacherB._id, email: teacherB.email, role: teacherB.role, collegeId: college._id },
      process.env.JWT_SECRET || 'test-secret-key-for-jest'
    );

    studentA = await User.create({
      name: 'Student Alpha',
      email: 'student.alpha@ivc.edu',
      passwordHash: 'hash',
      role: 'STUDENT',
      collegeId: college._id,
      approvalStatus: 'APPROVED',
    });
    studentTokenA = jwt.sign(
      { userId: studentA._id, email: studentA.email, role: studentA.role, collegeId: college._id },
      process.env.JWT_SECRET || 'test-secret-key-for-jest'
    );

    studentB = await User.create({
      name: 'Student Beta',
      email: 'student.beta@ivc.edu',
      passwordHash: 'hash',
      role: 'STUDENT',
      collegeId: college._id,
      approvalStatus: 'APPROVED',
    });

    classA = await Class.create({
      name: 'CS101 - Alpha',
      code: 'CS101A',
      teacherId: teacherA._id,
      collegeId: college._id,
      students: [studentA._id],
    });

    classB = await Class.create({
      name: 'CS102 - Beta',
      code: 'CS102B',
      teacherId: teacherB._id,
      collegeId: college._id,
      students: [studentB._id],
    });
  });

  describe('Security & Authorization', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/ai/interventions');
      expect(res.status).toBe(401);
    });

    it('rejects student requests with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/ai/interventions')
        .set('Authorization', `Bearer ${studentTokenA}`);
      expect(res.status).toBe(403);
    });

    it('allows authenticated instructor to access endpoint', async () => {
      const res = await request(app)
        .get('/api/ai/interventions')
        .set('Authorization', `Bearer ${teacherTokenA}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.interventions).toEqual([]);
    });
  });

  describe('Teacher Isolation & Scoping', () => {
    it('only returns interventions for students enrolled in teacher classes', async () => {
      // Intervention for student A (under Teacher A)
      await recordIntervention({
        studentId: studentA._id,
        classId: classA._id,
        type: 'WEAK_TOPIC',
        topic: 'loops',
        reason: 'Low quiz score in loops',
        recommendation: 'Practice for loops and while loops',
        previousScore: 35,
        source: 'QUIZ',
      });

      // Intervention for student B (under Teacher B)
      await recordIntervention({
        studentId: studentB._id,
        classId: classB._id,
        type: 'FAILED_ASSIGNMENT',
        topic: 'recursion',
        reason: 'Failed base case tests',
        recommendation: 'Trace recursive calls with stack diagrams',
        previousScore: 20,
        source: 'ASSIGNMENT_SUBMISSION',
      });

      // Teacher A requests interventions
      const resA = await request(app)
        .get('/api/ai/interventions')
        .set('Authorization', `Bearer ${teacherTokenA}`);

      expect(resA.status).toBe(200);
      expect(resA.body.data.interventions).toHaveLength(1);
      expect(resA.body.data.interventions[0].studentName).toBe('Student Alpha');
      expect(resA.body.data.interventions[0].topic).toBe('loops');

      // Teacher B requests interventions
      const resB = await request(app)
        .get('/api/ai/interventions')
        .set('Authorization', `Bearer ${teacherTokenB}`);

      expect(resB.status).toBe(200);
      expect(resB.body.data.interventions).toHaveLength(1);
      expect(resB.body.data.interventions[0].studentName).toBe('Student Beta');
      expect(resB.body.data.interventions[0].topic).toBe('recursion');
    });

    it('blocks teacher from querying arbitrary student outside their classes', async () => {
      // Teacher A tries to query Student B's interventions
      const res = await request(app)
        .get(`/api/ai/interventions?studentId=${studentB._id}`)
        .set('Authorization', `Bearer ${teacherTokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.interventions).toHaveLength(0); // Unauthorized query returns empty, no leak
    });
  });

  describe('Intervention Lifecycle & Score Tracking', () => {
    it('records intervention with previousScore and sets resultingScore to null (pending)', async () => {
      const intervention = await recordIntervention({
        studentId: studentA._id,
        classId: classA._id,
        type: 'WEAK_TOPIC',
        topic: 'arrays',
        reason: 'Off-by-one errors detected in array indexing',
        recommendation: 'Practice 0-indexed boundary problems',
        previousScore: 40,
        source: 'ASSIGNMENT_SUBMISSION',
      });

      expect(intervention).toBeDefined();
      expect(intervention.previousScore).toBe(40);
      expect(intervention.resultingScore).toBeNull();
      expect(intervention.scoreChange).toBeNull();
      expect(intervention.status).toBe('PENDING');

      // Verify via API
      const res = await request(app)
        .get('/api/ai/interventions')
        .set('Authorization', `Bearer ${teacherTokenA}`);

      expect(res.body.data.interventions[0].previousScore).toBe(40);
      expect(res.body.data.interventions[0].resultingScore).toBeNull();
      expect(res.body.data.interventions[0].scoreChange).toBeNull();
      expect(res.body.data.interventions[0].status).toBe('PENDING');
    });

    it('prevents duplicate interventions within 24 hours for same student, topic, and source', async () => {
      const first = await recordIntervention({
        studentId: studentA._id,
        classId: classA._id,
        type: 'WEAK_TOPIC',
        topic: 'pointers',
        reason: 'Memory leaks detected',
        recommendation: 'Always free allocated heap memory',
        previousScore: 30,
        source: 'ASSIGNMENT_SUBMISSION',
      });

      const duplicate = await recordIntervention({
        studentId: studentA._id,
        classId: classA._id,
        type: 'WEAK_TOPIC',
        topic: 'pointers',
        reason: 'Memory leaks detected again',
        recommendation: 'Always free allocated heap memory',
        previousScore: 30,
        source: 'ASSIGNMENT_SUBMISSION',
      });

      expect(first._id.toString()).toBe(duplicate._id.toString());

      const count = await AIIntervention.countDocuments({ studentId: studentA._id, topic: 'pointers' });
      expect(count).toBe(1);
    });

    it('calculates resulting score and improvement ONLY when student has later practice data', async () => {
      // 1. Create intervention at past timestamp
      const pastDate = new Date(Date.now() - 3600 * 1000); // 1 hour ago
      const intervention = await AIIntervention.create({
        studentId: studentA._id,
        classId: classA._id,
        type: 'WEAK_TOPIC',
        topic: 'strings',
        reason: 'Null terminator confusion',
        recommendation: 'Practice string length calculations',
        previousScore: 35,
        resultingScore: null,
        scoreChange: null,
        source: 'QUIZ',
        status: 'PENDING',
        createdAt: pastDate,
      });

      // 2. Student subsequently practices strings and achieves 65% mastery
      await Progress.create({
        studentId: studentA._id,
        language: 'javascript',
        topic: 'strings',
        masteryScore: 65,
        lastPracticedAt: new Date(), // Just now (AFTER intervention.createdAt)
      });

      // 3. Teacher queries interventions API
      const res = await request(app)
        .get('/api/ai/interventions')
        .set('Authorization', `Bearer ${teacherTokenA}`);

      expect(res.status).toBe(200);
      const item = res.body.data.interventions.find(i => i.topic === 'strings');
      expect(item).toBeDefined();
      expect(item.previousScore).toBe(35);
      expect(item.resultingScore).toBe(65);
      expect(item.scoreChange).toBe(30); // 65 - 35 = +30%
      expect(item.status).toBe('IMPROVED');
    });
  });
});
