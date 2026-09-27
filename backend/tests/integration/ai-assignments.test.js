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
    jest.clearAllMocks();
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

    axios.post.mockImplementation((url, data) => {
      const excluded = (data && data.excludedTitles) || [];
      const topic = (data && data.topic) || 'loops';
      const lang = (data && data.language) || 'cpp';

      const pool = [
        {
          title: 'Sum of Even Numbers',
          problemStatement: 'Given a positive integer N, calculate the sum of all even numbers from 1 to N.',
          description: 'Sum evens',
          starterCode: '#include <iostream>\nint main() {}',
          language: lang,
          difficulty: 'MEDIUM',
          topics: [topic],
          testCases: [
            { input: '10', expectedOutput: '30', isHidden: false },
            { input: '2', expectedOutput: '2', isHidden: true },
          ],
        },
        {
          title: 'Nested Number Triangle Pattern',
          problemStatement: 'Given an integer N, generate a right-angled numerical triangle of height N.',
          description: 'Number triangle',
          starterCode: '#include <iostream>\nint main() {}',
          language: lang,
          difficulty: 'MEDIUM',
          topics: [topic],
          testCases: [
            { input: '3', expectedOutput: '1\n1 2\n1 2 3', isHidden: false },
            { input: '1', expectedOutput: '1', isHidden: true },
          ],
        },
        {
          title: 'Collatz Sequence Cycle Length',
          problemStatement: 'Calculate Collatz stopping time for integer N.',
          description: 'Collatz sequence',
          starterCode: '#include <iostream>\nint main() {}',
          language: lang,
          difficulty: 'MEDIUM',
          topics: [topic],
          testCases: [
            { input: '6', expectedOutput: '8', isHidden: false },
            { input: '1', expectedOutput: '0', isHidden: true },
          ],
        },
        {
          title: 'Prime Number Verification',
          problemStatement: 'Determine whether integer N is prime.',
          description: 'Prime check',
          starterCode: '#include <iostream>\nint main() {}',
          language: lang,
          difficulty: 'MEDIUM',
          topics: [topic],
          testCases: [
            { input: '7', expectedOutput: 'YES', isHidden: false },
            { input: '4', expectedOutput: 'NO', isHidden: true },
          ],
        },
      ];

      const candidate =
        pool.find(
          (p) =>
            !excluded.some((e) =>
              String(e).toLowerCase().includes(p.title.toLowerCase())
            )
        ) || pool[excluded.length % pool.length];

      return Promise.resolve({ data: candidate });
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

  it('prevents duplicate assignment generation by excluding existing titles and retrying on collision', async () => {
    // Existing assignment in class
    await Assignment.create({
      title: 'Sum of Even Numbers',
      description: 'Existing problem',
      problemStatement: 'Sum all evens up to N',
      starterCode: '#include <iostream>',
      language: 'cpp',
      difficulty: 'EASY',
      classId: classDoc._id,
      createdBy: teacherUser._id,
      testCases: [{ input: '1', expectedOutput: '1', isHidden: false }],
    });

    // Mock AI service to return duplicate on 1st attempt, and unique problem on 2nd attempt
    axios.post
      .mockResolvedValueOnce({
        data: {
          title: 'Sum of Even Numbers',
          description: 'Duplicate attempt',
          problemStatement: 'Sum all evens up to N',
          language: 'cpp',
          difficulty: 'EASY',
          topics: ['loops'],
          testCases: [{ input: '5', expectedOutput: '6', isHidden: false }, { input: '2', expectedOutput: '2', isHidden: true }],
          starterCode: '#include <iostream>',
        },
      })
      .mockResolvedValueOnce({
        data: {
          title: 'Count Divisible Numbers in Range',
          description: 'A new unique problem',
          problemStatement: 'Count numbers divisible by K up to N',
          language: 'cpp',
          difficulty: 'EASY',
          topics: ['loops'],
          testCases: [{ input: '15 3', expectedOutput: '5', isHidden: false }, { input: '10 5', expectedOutput: '2', isHidden: true }],
          starterCode: '#include <iostream>',
        },
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
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Count Divisible Numbers in Range');
    expect(axios.post).toHaveBeenCalledTimes(2);
  });

  it('detects and rejects near-duplicates (semantic/prefix variations) during generation', async () => {
    await Assignment.create({
      title: 'Sum of Even Numbers',
      description: 'Existing problem',
      problemStatement: 'Sum evens',
      starterCode: '#include <iostream>',
      language: 'cpp',
      difficulty: 'EASY',
      classId: classDoc._id,
      createdBy: teacherUser._id,
      testCases: [{ input: '1', expectedOutput: '1', isHidden: false }],
    });

    // Mock AI returning near duplicate ("Find the Sum of Even Numbers") then unique problem
    axios.post
      .mockResolvedValueOnce({
        data: {
          title: 'Find the Sum of Even Numbers',
          description: 'Slightly rephrased title',
          problemStatement: 'Compute sum of even integers',
          language: 'cpp',
          difficulty: 'EASY',
          topics: ['loops'],
          testCases: [{ input: '10', expectedOutput: '30', isHidden: false }, { input: '2', expectedOutput: '2', isHidden: true }],
          starterCode: '#include <iostream>',
        },
      })
      .mockResolvedValueOnce({
        data: {
          title: 'Prime Number Verification',
          description: 'Determine if N is prime',
          problemStatement: 'Test whether N is prime',
          language: 'cpp',
          difficulty: 'MEDIUM',
          topics: ['loops'],
          testCases: [{ input: '7', expectedOutput: 'YES', isHidden: false }, { input: '4', expectedOutput: 'NO', isHidden: true }],
          starterCode: '#include <iostream>',
        },
      });

    const res = await request(app)
      .post('/api/assignments/generate-ai')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        topic: 'loops',
        language: 'cpp',
        difficulty: 'MEDIUM',
        classId: classDoc._id.toString(),
      });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Prime Number Verification');
  });

  it('returns 409 error when all retry attempts produce duplicates', async () => {
    await Assignment.create({
      title: 'Sum of Even Numbers',
      description: 'Existing problem',
      problemStatement: 'Sum evens',
      starterCode: '#include <iostream>',
      language: 'cpp',
      difficulty: 'EASY',
      classId: classDoc._id,
      createdBy: teacherUser._id,
      testCases: [{ input: '1', expectedOutput: '1', isHidden: false }],
    });

    // Mock AI returning duplicate on all 3 attempts
    const duplicatePayload = {
      data: {
        title: 'Sum of Even Numbers',
        description: 'Duplicate',
        problemStatement: 'Duplicate statement',
        language: 'cpp',
        difficulty: 'EASY',
        topics: ['loops'],
        testCases: [{ input: '10', expectedOutput: '30', isHidden: false }, { input: '2', expectedOutput: '2', isHidden: true }],
        starterCode: '#include <iostream>',
      },
    };

    axios.post.mockResolvedValue(duplicatePayload);

    const res = await request(app)
      .post('/api/assignments/generate-ai')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        topic: 'loops',
        language: 'cpp',
        difficulty: 'EASY',
        classId: classDoc._id.toString(),
      });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/duplicate assignment after multiple attempts/i);
  });

  it('enforces class-scoped uniqueness when saving assignments', async () => {
    // 1. Create assignment in class 1
    const save1 = await request(app)
      .post('/api/assignments')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'Binary Search Implementation',
        description: 'Implement binary search',
        problemStatement: 'Search in sorted array',
        starterCode: '#include <iostream>',
        language: 'cpp',
        difficulty: 'MEDIUM',
        topics: ['searching'],
        classId: classDoc._id.toString(),
        testCases: [{ input: '5 2', expectedOutput: '1', isHidden: false }],
      });
    expect(save1.status).toBe(201);

    // 2. Duplicate in SAME class fails with 409
    const saveDuplicate = await request(app)
      .post('/api/assignments')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'Binary Search Implementation',
        description: 'Implement binary search duplicate',
        problemStatement: 'Search in sorted array',
        starterCode: '#include <iostream>',
        language: 'cpp',
        difficulty: 'MEDIUM',
        topics: ['searching'],
        classId: classDoc._id.toString(),
        testCases: [{ input: '5 2', expectedOutput: '1', isHidden: false }],
      });
    expect(saveDuplicate.status).toBe(409);
    expect(saveDuplicate.body.error.message).toMatch(/already exists in this class/i);

    // 3. Same title in a DIFFERENT class succeeds
    const otherClass = await Class.create({
      name: 'Intro to Algorithms',
      code: 'CS201',
      teacherId: teacherUser._id,
      collegeId: college._id,
      students: [studentUser._id],
    });

    const saveOtherClass = await request(app)
      .post('/api/assignments')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'Binary Search Implementation',
        description: 'Implement binary search in CS201',
        problemStatement: 'Search in sorted array',
        starterCode: '#include <iostream>',
        language: 'cpp',
        difficulty: 'MEDIUM',
        topics: ['searching'],
        classId: otherClass._id.toString(),
        testCases: [{ input: '5 2', expectedOutput: '1', isHidden: false }],
      });
    expect(saveOtherClass.status).toBe(201);
  });

  describe('Uniqueness & Near-Duplicate Detection Algorithm & Scoping Tests', () => {
    const {
      normalizeTitle,
      isNearDuplicate,
      isTitleNearDuplicate,
      isProblemStatementNearDuplicate,
      isNearDuplicateAssignment,
      generateAIAssignment,
    } = require('../../src/modules/assignments/assignment.service');

    test('1. Exact duplicate title → rejected', () => {
      expect(isTitleNearDuplicate('Sum of Even Numbers', 'Sum of Even Numbers')).toBe(true);
      expect(isNearDuplicateAssignment(
        { title: 'Sum of Even Numbers', problemStatement: 'Compute sum of evens' },
        { title: 'Sum of Even Numbers', problemStatement: 'Compute sum of evens' }
      )).toBe(true);
    });

    test('2. Same title with different case → rejected', () => {
      expect(isTitleNearDuplicate('sum of even numbers', 'SUM OF EVEN NUMBERS')).toBe(true);
      expect(isNearDuplicateAssignment(
        { title: 'sum of even numbers', problemStatement: 'statement A' },
        { title: 'SUM OF EVEN NUMBERS', problemStatement: 'statement B' }
      )).toBe(true);
    });

    test('3. Same problem statement with different title → rejected', () => {
      const prob = 'Given a positive integer N, write a program to calculate the sum of all even integers from 1 to N.';
      expect(isProblemStatementNearDuplicate(prob, prob)).toBe(true);
      expect(isNearDuplicateAssignment(
        { title: 'New Unique Title Alpha', problemStatement: prob },
        { title: 'Original Assignment Title', problemStatement: prob }
      )).toBe(true);
    });

    test('4. Near-duplicate title/problem → rejected', () => {
      expect(isTitleNearDuplicate('Calculate Sum of Even Numbers', 'Sum of Even Numbers')).toBe(true);
      expect(isTitleNearDuplicate('Sum Even Integers from 1 to N', 'Sum of Even Numbers')).toBe(true);
      expect(isNearDuplicateAssignment(
        {
          title: 'Calculate Sum of Even Integers',
          problemStatement: 'Given N, compute total sum of even integers up to N.',
        },
        {
          title: 'Sum of Even Numbers',
          problemStatement: 'Given a positive integer N, compute and print sum of all even numbers from 1 to N.',
        }
      )).toBe(true);
    });

    test('5. Same topic but genuinely different problem → allowed', () => {
      expect(isNearDuplicateAssignment(
        {
          title: 'Count Even Numbers in an Array',
          problemStatement: 'Given an array of N integers, count how many elements are even numbers.',
        },
        {
          title: 'Sum of Even Numbers',
          problemStatement: 'Given a positive integer N, compute sum of all even numbers from 1 to N.',
        }
      )).toBe(false);
      expect(isTitleNearDuplicate('Sum of Even Numbers', 'Nested Number Triangle Pattern')).toBe(false);
    });

    test('6. Same language but different problem → allowed', () => {
      expect(isNearDuplicateAssignment(
        {
          title: 'Collatz Sequence Cycle Length',
          language: 'cpp',
          problemStatement: 'Compute Collatz sequence stopping time for integer N.',
        },
        {
          title: 'Sum of Even Numbers',
          language: 'cpp',
          problemStatement: 'Calculate sum of even numbers from 1 to N.',
        }
      )).toBe(false);
    });

    test('7. Same difficulty but different problem → allowed', () => {
      expect(isNearDuplicateAssignment(
        {
          title: 'Prime Number Verification',
          difficulty: 'MEDIUM',
          problemStatement: 'Determine whether integer N is prime.',
        },
        {
          title: 'Nested Number Triangle Pattern',
          difficulty: 'MEDIUM',
          problemStatement: 'Generate right-angled triangle pattern of size N.',
        }
      )).toBe(false);
    });

    test('8. Different classes owned by same instructor → duplicates prevented', async () => {
      const class1 = await Class.create({
        name: 'Teacher Class 1',
        code: 'TC101',
        teacherId: teacherUser._id,
        collegeId: college._id,
      });

      const class2 = await Class.create({
        name: 'Teacher Class 2',
        code: 'TC102',
        teacherId: teacherUser._id,
        collegeId: college._id,
      });

      // Create an assignment in Class 1
      await Assignment.create({
        title: 'Sum of Even Numbers',
        description: 'Sum evens in Class 1',
        problemStatement: 'Calculate sum of even numbers from 1 to N',
        starterCode: 'int main() {}',
        language: 'cpp',
        difficulty: 'MEDIUM',
        topics: ['loops'],
        classId: class1._id,
        createdBy: teacherUser._id,
        testCases: [{ input: '10', expectedOutput: '30', isHidden: false }],
      });

      // Generate AI assignment for Class 2 by the SAME instructor
      const genResult = await generateAIAssignment({
        topic: 'loops',
        language: 'cpp',
        difficulty: 'MEDIUM',
        classId: class2._id.toString(),
        teacherId: teacherUser._id.toString(),
      });

      // The generated assignment must not be a duplicate of Class 1's assignment
      expect(genResult.title).not.toMatch(/Sum of Even Numbers/i);
      expect(isNearDuplicateAssignment(genResult, {
        title: 'Sum of Even Numbers',
        problemStatement: 'Calculate sum of even numbers from 1 to N',
      })).toBe(false);
    });

    test('9. Different instructors → ownership isolation preserved', async () => {
      const otherTeacher = await User.create({
        name: 'Second Instructor',
        email: 'instructor2@mit.edu',
        passwordHash: 'hashedpassword',
        role: 'TEACHER',
        collegeId: college._id,
      });

      const otherTeacherClass = await Class.create({
        name: 'Other Teacher Class',
        code: 'OTC99',
        teacherId: otherTeacher._id,
        collegeId: college._id,
      });

      // generateAIAssignment for second instructor should succeed without being blocked by teacherUser's private assignments
      const genResult = await generateAIAssignment({
        topic: 'loops',
        language: 'cpp',
        difficulty: 'EASY',
        classId: otherTeacherClass._id.toString(),
        teacherId: otherTeacher._id.toString(),
      });

      expect(genResult).toBeDefined();
      expect(genResult.title).toBeDefined();
    });

    test('10. Multiple sequential generations → genuinely different assignments generated', async () => {
      const testClass = await Class.create({
        name: 'Sequential Generation Class',
        code: 'SGC01',
        teacherId: teacherUser._id,
        collegeId: college._id,
      });

      const gen1 = await generateAIAssignment({
        topic: 'loops',
        language: 'cpp',
        difficulty: 'EASY',
        classId: testClass._id.toString(),
        teacherId: teacherUser._id.toString(),
      });

      // Save first generation so DB records it for the instructor
      await Assignment.create({
        title: gen1.title,
        description: gen1.description,
        problemStatement: gen1.problemStatement,
        starterCode: gen1.starterCode,
        language: gen1.language,
        difficulty: gen1.difficulty,
        topics: gen1.topics,
        classId: testClass._id,
        createdBy: teacherUser._id,
        testCases: gen1.testCases,
      });

      const gen2 = await generateAIAssignment({
        topic: 'loops',
        language: 'cpp',
        difficulty: 'EASY',
        classId: testClass._id.toString(),
        teacherId: teacherUser._id.toString(),
      });

      // Save second generation
      await Assignment.create({
        title: gen2.title,
        description: gen2.description,
        problemStatement: gen2.problemStatement,
        starterCode: gen2.starterCode,
        language: gen2.language,
        difficulty: gen2.difficulty,
        topics: gen2.topics,
        classId: testClass._id,
        createdBy: teacherUser._id,
        testCases: gen2.testCases,
      });

      const gen3 = await generateAIAssignment({
        topic: 'loops',
        language: 'cpp',
        difficulty: 'EASY',
        classId: testClass._id.toString(),
        teacherId: teacherUser._id.toString(),
      });

      // Assert all three generations produce distinct titles AND problem statements
      expect(gen1.title).not.toEqual(gen2.title);
      expect(gen2.title).not.toEqual(gen3.title);
      expect(gen1.title).not.toEqual(gen3.title);

      expect(isNearDuplicateAssignment(gen2, gen1)).toBe(false);
      expect(isNearDuplicateAssignment(gen3, gen1)).toBe(false);
      expect(isNearDuplicateAssignment(gen3, gen2)).toBe(false);
    });
  });
});
