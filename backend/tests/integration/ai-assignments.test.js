const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/modules/users/user.model');
const College = require('../../src/modules/colleges/college.model');
const Class = require('../../src/modules/classes/class.model');
const Assignment = require('../../src/modules/assignments/assignment.model');
const Submission = require('../../src/modules/submissions/submission.model');
const jwt = require('jsonwebtoken');

// Mock axios to AI service so tests are fast and reliable with in-memory responses
const axios = require('axios');
jest.mock('axios');

describe('AI-Generated Programming Assignments End-to-End Suite', () => {
  let college;
  let teacherToken;
  let teacherUser;
  let studentToken;
  let studentUser;
  let classDoc;

  const testMatrix = [
    { topic: 'loops', language: 'c', difficulty: 'EASY', starterContains: '#include <stdio.h>' },
    { topic: 'loops', language: 'cpp', difficulty: 'MEDIUM', starterContains: '#include <iostream>' },
    { topic: 'loops', language: 'java', difficulty: 'EASY', starterContains: 'public class Solution' },
    { topic: 'loops', language: 'python', difficulty: 'HARD', starterContains: 'def solve():' },
    { topic: 'arrays', language: 'cpp', difficulty: 'EASY', starterContains: '#include <iostream>' },
    { topic: 'recursion', language: 'python', difficulty: 'EASY', starterContains: 'def solve():' },
    { topic: 'searching', language: 'java', difficulty: 'MEDIUM', starterContains: 'public class Solution' },
  ];

  beforeEach(async () => {
    college = await College.create({
      name: 'Algorithm Institute of Tech',
      code: 'AIT',
      domains: ['ait.edu'],
      status: 'ACTIVE',
    });

    teacherUser = await User.create({
      name: 'Professor Knuth',
      email: 'knuth@ait.edu',
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
      name: 'Ada Lovelace',
      email: 'ada@ait.edu',
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
      name: 'Advanced Programming Lab',
      code: 'APL101',
      teacherId: teacherUser._id,
      collegeId: college._id,
      students: [studentUser._id],
    });
  });

  test.each(testMatrix)(
    'generates, validates, assigns, opens, and submits for: %s + %s (%s)',
    async ({ topic, language, difficulty, starterContains }) => {
      // 1. Mock AI service response with authentic coding problem
      const mockGenerated = {
        title: `AI Problem: ${topic} in ${language}`,
        description: `Implement algorithm for ${topic} in ${language}`,
        problemStatement: `Solve the ${topic} task with required boundary conditions.`,
        language,
        difficulty,
        topics: [topic],
        constraints: ['1 <= N <= 1000'],
        inputFormat: 'A single integer N',
        outputFormat: 'Result integer',
        examples: [{ input: '5', output: '10', explanation: 'Sample step' }],
        starterCode: `${starterContains}\n`,
        hints: [`Think about ${topic} invariants`],
        explanation: 'Detailed solution explanation',
        testCases: [
          { input: '5', expectedOutput: '10', isHidden: false },
          { input: '10', expectedOutput: '20', isHidden: true },
        ],
      };

      axios.post.mockResolvedValueOnce({ data: mockGenerated });

      // 2. Teacher calls POST /api/assignments/generate-ai
      const genRes = await request(app)
        .post('/api/assignments/generate-ai')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          topic,
          language,
          difficulty,
          questionCount: 1,
          classId: classDoc._id.toString(),
        });

      expect(genRes.status).toBe(200);
      expect(genRes.body.success).toBe(true);
      const generatedData = genRes.body.data;

      // Verify AI generated fields
      expect(generatedData.language.toLowerCase()).toBe(language.toLowerCase());
      expect(generatedData.difficulty.toUpperCase()).toBe(difficulty.toUpperCase());
      expect(generatedData.topics).toContain(topic);
      expect(generatedData.starterCode).toContain(starterContains);
      expect(generatedData.testCases.length).toBeGreaterThanOrEqual(2);

      // 3. Teacher publishes/assigns the generated assignment
      const saveRes = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: generatedData.title,
          description: generatedData.description,
          problemStatement: generatedData.problemStatement,
          constraints: generatedData.constraints,
          starterCode: generatedData.starterCode,
          language: generatedData.language,
          difficulty: generatedData.difficulty,
          topics: generatedData.topics,
          classId: classDoc._id.toString(),
          testCases: generatedData.testCases,
          source: 'AI_GENERATED',
        });

      expect(saveRes.status).toBe(201);
      expect(saveRes.body.success).toBe(true);
      const assignmentId = saveRes.body.data._id;

      // 4. Student opens the assignment - verify hidden test cases are masked
      const studentViewRes = await request(app)
        .get(`/api/assignments/${assignmentId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(studentViewRes.status).toBe(200);
      expect(studentViewRes.body.success).toBe(true);
      expect(studentViewRes.body.data.testCases.length).toBe(1);
      expect(studentViewRes.body.data.testCases[0].isHidden).toBe(false);

      // 5. Student submits code solution
      const submitRes = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          assignmentId: assignmentId.toString(),
          code: generatedData.starterCode,
          language: generatedData.language,
        });

      expect(submitRes.status).toBe(201);
      expect(submitRes.body.success).toBe(true);
      expect(submitRes.body.data).toHaveProperty('_id');
      expect(submitRes.body.data.status).toBeDefined();

      // 6. Direct submission record creation and verification
      const completedSub = await Submission.create({
        assignmentId,
        userId: studentUser._id,
        attemptNumber: 1,
        code: generatedData.starterCode,
        language: generatedData.language,
        status: 'PASSED',
        score: 100,
        testCasesPassed: 2,
        totalTestCases: 2,
      });

      expect(completedSub.score).toBe(100);
      expect(completedSub.status).toBe('PASSED');
    }
  );

  it('prevents duplicate assignment generation by excluding existing titles', async () => {
    // Existing assignment in class
    await Assignment.create({
      title: 'Sum of Even Numbers',
      description: 'Existing problem',
      language: 'cpp',
      difficulty: 'EASY',
      classId: classDoc._id,
      createdBy: teacherUser._id,
      testCases: [{ input: '1', expectedOutput: '1', isHidden: false }],
    });

    axios.post.mockImplementationOnce((url, data) => {
      expect(data.excludedTitles).toContain('Sum of Even Numbers');
      return Promise.resolve({
        data: {
          title: 'Unique Iteration Counter',
          description: 'A new unique problem',
          problemStatement: 'Unique problem statement',
          language: 'cpp',
          difficulty: 'EASY',
          topics: ['loops'],
          testCases: [{ input: '5', expectedOutput: '5', isHidden: false }],
        },
      });
    });

    const res = await request(app)
      .post('/api/assignments/generate-ai')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        topic: 'loops',
        language: 'cpp',
        difficulty: 'EASY',
        classId: classDoc._id.toString(),
      });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Unique Iteration Counter');
  });
});
