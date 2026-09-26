const path = require('path');
const fs = require('fs');
const jwt = require('../backend/node_modules/jsonwebtoken');

require('../backend/node_modules/dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const tokens = JSON.parse(fs.readFileSync(path.join(__dirname, 'tokens.json'), 'utf8'));
const teacher = tokens.teacher;
const student1 = tokens.students[0];
const student2 = tokens.students[1];
const JWT_SECRET = process.env.JWT_SECRET;

async function testEndpoint(name, url, method = 'GET', token = null, body = null) {
  const headers = { 'Accept': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => null);
  return { name, status: res.status, ok: res.ok, data };
}

async function runAuthAudit() {
  console.log('======================================================================');
  console.log('3. AUTHENTICATION & RBAC COMPREHENSIVE AUDIT');
  console.log('======================================================================');

  const results = [];

  // 1. Student /me
  results.push(await testEndpoint('Student /me', 'http://localhost:3000/api/auth/me', 'GET', student1.token));

  // 2. Student dashboard
  results.push(await testEndpoint('Student Dashboard', 'http://localhost:3000/api/student/dashboard', 'GET', student1.token));

  // 3. Student assignments
  results.push(await testEndpoint('Student Assignments', 'http://localhost:3000/api/assignments', 'GET', student1.token));

  // 4. Student quizzes
  results.push(await testEndpoint('Student Today Quiz', 'http://localhost:3000/api/quizzes/today?language=cpp', 'GET', student1.token));

  // 5. Student submissions
  results.push(await testEndpoint('Student Submissions', 'http://localhost:3000/api/submissions', 'GET', student1.token));

  // 6. Teacher /me
  results.push(await testEndpoint('Teacher /me', 'http://localhost:3000/api/auth/me', 'GET', teacher.token));

  // 7. Teacher classes
  results.push(await testEndpoint('Teacher Classes', 'http://localhost:3000/api/classes', 'GET', teacher.token));

  // 8. Teacher assignments
  results.push(await testEndpoint('Teacher Assignments', 'http://localhost:3000/api/assignments', 'GET', teacher.token));

  // 9. RBAC: Student cannot create assignment (Teacher only)
  results.push(await testEndpoint('RBAC: Student POST /api/assignments', 'http://localhost:3000/api/assignments', 'POST', student1.token, {
    title: 'Hacked Assignment',
    description: 'test',
    language: 'python',
    difficulty: 'EASY',
    classId: tokens.classId
  }));

  // 10. RBAC: Student cannot view teacher assignment results
  results.push(await testEndpoint('RBAC: Student GET /api/assignments/:id/results', `http://localhost:3000/api/assignments/${tokens.assignmentId}/results`, 'GET', student1.token));

  // 11. RBAC: Teacher cannot access student-private dashboard
  results.push(await testEndpoint('RBAC: Teacher GET /api/student/dashboard', 'http://localhost:3000/api/student/dashboard', 'GET', teacher.token));

  // 12. Security: Invalid JWT token
  results.push(await testEndpoint('Security: Invalid JWT', 'http://localhost:3000/api/auth/me', 'GET', 'invalid.token.signature'));

  // 13. Security: Expired JWT token
  const expiredToken = jwt.sign(
    { userId: student1.id, role: 'STUDENT' },
    JWT_SECRET,
    { expiresIn: '-1s' }
  );
  results.push(await testEndpoint('Security: Expired JWT', 'http://localhost:3000/api/auth/me', 'GET', expiredToken));

  // 14. Security: Tampered JWT token (changed role to TEACHER with original signature)
  const tamperedParts = student1.token.split('.');
  const payload = JSON.parse(Buffer.from(tamperedParts[1], 'base64').toString());
  payload.role = 'TEACHER';
  const tamperedToken = `${tamperedParts[0]}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${tamperedParts[2]}`;
  results.push(await testEndpoint('Security: Tampered Role JWT', 'http://localhost:3000/api/classes', 'GET', tamperedToken));

  // 15. Security: No Authorization header
  results.push(await testEndpoint('Security: No Auth Header', 'http://localhost:3000/api/auth/me', 'GET', null));

  console.log('\n--- RBAC & Authentication Test Results ---');
  for (const r of results) {
    const passed = 
      (r.name.startsWith('Student ') && r.status === 200) ||
      (r.name.startsWith('Teacher ') && r.status === 200) ||
      (r.name.includes('Student POST /api/assignments') && r.status === 403) ||
      (r.name.includes('Student GET /api/assignments/:id/results') && r.status === 403) ||
      (r.name.includes('Teacher GET /api/student/dashboard') && r.status === 403) ||
      (r.name.includes('Security: Invalid JWT') && r.status === 401) ||
      (r.name.includes('Security: Expired JWT') && r.status === 401) ||
      (r.name.includes('Security: Tampered') && r.status === 401) ||
      (r.name.includes('Security: No Auth') && r.status === 401);

    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${r.name.padEnd(45)} -> Status ${r.status} (${r.data?.error?.code || 'OK'})`);
  }
}

runAuthAudit().catch(console.error);
