const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/modules/users/user.model');
const College = require('../../src/modules/colleges/college.model');
const Quiz = require('../../src/modules/quizzes/quiz.model');
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
});
