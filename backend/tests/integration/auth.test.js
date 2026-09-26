const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/modules/users/user.model');
const College = require('../../src/modules/colleges/college.model');

describe('Auth API', () => {
  let collegeId;

  const testStudent = {
    name: 'Test Student',
    email: 'test@student.edu',
    password: 'Password123!',
    role: 'STUDENT',
  };

  beforeEach(async () => {
    const college = await College.create({
      name: 'Test University',
      code: 'TU',
      domains: ['student.edu'],
      status: 'ACTIVE'
    });
    collegeId = college._id;
  });

  it('should register a new student', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send(testStudent);
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('token');
    expect(response.body.data.user).toHaveProperty('email', testStudent.email);
    expect(response.body.data.user).toHaveProperty('role', 'STUDENT');
  });

  it('should not register a user with an existing email', async () => {
    // Register first time
    await request(app).post('/api/auth/register').send(testStudent);
    
    // Register second time
    const response = await request(app)
      .post('/api/auth/register')
      .send(testStudent);
    
    expect(response.status).toBe(409);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body.error).toHaveProperty('code', 'USER_EXISTS');
  });

  it('should login an existing user', async () => {
    await request(app).post('/api/auth/register').send(testStudent);
    
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testStudent.email,
        password: testStudent.password,
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('token');
  });
});
