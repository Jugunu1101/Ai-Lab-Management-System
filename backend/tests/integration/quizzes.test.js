const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/modules/users/user.model');
const College = require('../../src/modules/colleges/college.model');
const Quiz = require('../../src/modules/quizzes/quiz.model');
const { validateQuestionTopic } = require('../../src/modules/quizzes/quiz.service');
const jwt = require('jsonwebtoken');

describe('Quizzes API', () => {
  let college;
  let teacherToken;
  let teacherUser;
  let studentToken;
  let studentUser;

  beforeEach(async () => {
    college = await College.create({
      name: 'Science University',
      code: 'SU',
      domains: ['science.edu'],
      status: 'ACTIVE',
    });

    teacherUser = await User.create({
      name: 'Teacher Jane',
      email: 'jane@science.edu',
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
      name: 'Student Sam',
      email: 'sam@science.edu',
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

  it('allows teacher to create a quiz', async () => {
    const res = await request(app)
      .post('/api/quizzes')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'JavaScript Closures Quiz',
        language: 'javascript',
        topic: 'closures',
        questions: [
          {
            question: 'What is a closure?',
            options: ['A function inside another function with access to outer scope', 'A loop', 'A variable', 'A database'],
            correctAnswer: 'A function inside another function with access to outer scope',
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('title', 'JavaScript Closures Quiz');
  });

  it('allows student to submit answers to a quiz and calculates score', async () => {
    const quiz = await Quiz.create({
      title: 'Python Basics',
      language: 'python',
      topic: 'variables',
      questions: [
        {
          question: 'What is the output of type(5)?',
          options: ["<class 'int'>", "<class 'str'>", "<class 'float'>", "<class 'list'>"],
          correctAnswer: "<class 'int'>",
        },
      ],
      createdBy: teacherUser._id,
    });

    const res = await request(app)
      .post(`/api/quizzes/${quiz._id}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        answers: [
          {
            selectedAnswer: "<class 'int'>",
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.score).toBe(100);
    expect(res.body.data.totalQuestions).toBe(1);
    expect(res.body.data.correctAnswers).toBe(1);
  });

  describe('Topic Specificity Validation', () => {
    it('rejects array traversal & time complexity questions when topic is variables', () => {
      const q1 = {
        question: 'What is the time complexity of traversing an array of size N in CPP?',
        options: ['O(1)', 'O(N)', 'O(N^2)', 'O(log N)'],
        topic: 'variables',
      };
      expect(validateQuestionTopic(q1, ['variables'])).toBe(false);

      const q2 = {
        question: 'What is the value of variable x after: int x = 10; x = x + 5;?',
        options: ['15', '10', '5', '0'],
        topic: 'variables',
      };
      expect(validateQuestionTopic(q2, ['variables'])).toBe(true);
    });

    it('rejects variable declaration questions when topic is loops', () => {
      const qVar = {
        question: 'Which statement correctly declares an integer variable in C++?',
        options: ['int x = 10;', 'var x = 10', 'let x = 10', 'integer x = 10'],
      };
      expect(validateQuestionTopic(qVar, ['loops'])).toBe(false);

      const qLoop = {
        question: 'What is the output of for (int i = 0; i < 3; i++) cout << i;',
        options: ['012', '123', '0123', '321'],
      };
      expect(validateQuestionTopic(qLoop, ['loops'])).toBe(true);
    });

    it('validates all major topics correctly', () => {
      expect(validateQuestionTopic({ question: 'int arr[5] = {1, 2}; access arr[0]', options: ['1', '2', '0', '5'] }, ['arrays'])).toBe(true);
      expect(validateQuestionTopic({ question: 'if (x > 10) print("YES")', options: ['YES', 'NO', 'ERROR', 'NONE'] }, ['conditionals'])).toBe(true);
      expect(validateQuestionTopic({ question: 'int fact(int n) { if (n <= 1) return 1; return n * fact(n-1); }', options: ['6', '3', '1', '0'] }, ['recursion'])).toBe(true);
      expect(validateQuestionTopic({ question: 'bool result = (true && false)', options: ['false', 'true', 'null', '1'] }, ['logic'])).toBe(true);
      expect(validateQuestionTopic({ question: 'Syntax error missing semicolon at end of statement', options: ['Syntax error', 'Loop', 'Variable', 'Array'] }, ['syntax'])).toBe(true);
      expect(validateQuestionTopic({ question: 'What is the output of 15 % 4 arithmetic operator?', options: ['3', '0', '4', '15'] }, ['basics'])).toBe(true);
    });
  });

  describe('GET /api/quiz/practice topic and language enforcement', () => {
    it('generates practice quiz with 10 questions all matching requested topic (variables, cpp)', async () => {
      const res = await request(app)
        .get('/api/quiz/practice?topic=variables&language=cpp')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const quiz = res.body.data.quiz || res.body.data;
      expect(quiz.questions.length).toBe(10);

      // Verify EVERY question genuinely matches variables
      quiz.questions.forEach((q) => {
        const text = `${q.question} ${(q.options || []).join(' ')}`;
        expect(validateQuestionTopic(q, ['variables'])).toBe(true);
        // Ensure no array traversal time complexity question bled in
        expect(text).not.toMatch(/time complexity of traversing an array/i);
      });
    });

    it('generates practice quiz with 10 questions matching requested topic (loops, python)', async () => {
      const res = await request(app)
        .get('/api/quiz/practice?topic=loops&language=python')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      const quiz = res.body.data.quiz || res.body.data;
      expect(quiz.questions.length).toBe(10);
      quiz.questions.forEach((q) => {
        expect(validateQuestionTopic(q, ['loops'])).toBe(true);
      });
    });
  });
});

