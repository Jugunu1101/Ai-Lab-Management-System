const path = require('path');
const fs = require('fs');

require('../backend/node_modules/dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const tokens = JSON.parse(fs.readFileSync(path.join(__dirname, 'tokens.json'), 'utf8'));
const studentToken = tokens.students[0].token;
const teacherToken = tokens.teacher.token;

async function runErrorAudit() {
  console.log('======================================================================');
  console.log('11. API ERROR HANDLING AUDIT');
  console.log('======================================================================');

  const tests = [
    // 1. 400 Bad Request
    {
      statusTarget: 400,
      name: '400 Validation Error (Bad payload)',
      url: 'http://localhost:3000/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' })
    },
    // 2. 401 Unauthorized
    {
      statusTarget: 401,
      name: '401 Unauthorized (Missing token)',
      url: 'http://localhost:3000/api/auth/me',
      method: 'GET',
      headers: {}
    },
    // 3. 403 Forbidden
    {
      statusTarget: 403,
      name: '403 Forbidden (Student hitting teacher endpoint)',
      url: 'http://localhost:3000/api/classes',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${studentToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacked Class', language: 'python' })
    },
    // 4. 404 Not Found
    {
      statusTarget: 404,
      name: '404 Not Found (Non-existent endpoint)',
      url: 'http://localhost:3000/api/non-existent-endpoint-xyz',
      method: 'GET',
      headers: {}
    },
    // 5. 409 Duplicate
    {
      statusTarget: 409,
      name: '409 Conflict (Duplicate email registration)',
      url: 'http://localhost:3000/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Teacher',
        email: 'loadtest_teacher@mit.edu',
        password: 'Password123!',
        role: 'TEACHER'
      })
    },
    // 6. 422 Unprocessable Entity (AI service schema validation)
    {
      statusTarget: 422,
      name: '422 Unprocessable Entity (AI Schema validation)',
      url: 'http://localhost:8000/ai/generate-quiz',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalidField: 123 })
    },
    // 7. 429 Rate Limit (AI endpoint rate limit)
    {
      statusTarget: 429,
      name: '429 Rate Limited (Exceeded quota)',
      url: 'http://localhost:8000/ai/generate-quiz',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topics: ['arrays'], language: 'cpp', difficulty: 'medium', questionCount: 10 }),
      customTrigger: async () => {
        let res;
        for (let i = 0; i < 35; i++) {
          res = await fetch('http://localhost:8000/ai/generate-quiz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topics: ['arrays'], language: 'cpp', difficulty: 'medium', questionCount: 10 })
          });
          if (res.status === 429) break;
        }
        return res;
      }
    }
  ];

  for (const t of tests) {
    let res;
    if (t.customTrigger) {
      res = await t.customTrigger();
    } else {
      res = await fetch(t.url, { method: t.method, headers: t.headers, body: t.body });
    }
    const data = await res.json().catch(() => null);
    const pass = res.status === t.statusTarget;

    const hasStack = JSON.stringify(data).includes('stack') || JSON.stringify(data).includes('node_modules');
    const hasDbErr = JSON.stringify(data).includes('MongoServerError');
    const hasSecret = JSON.stringify(data).includes(process.env.JWT_SECRET || 'SECRET');

    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${t.name.padEnd(50)} -> Status ${res.status} | Code: ${data?.error?.code || data?.detail || 'N/A'}`);
    if (hasStack) console.warn('  [WARNING] Stack trace detected in response!');
    if (hasDbErr) console.warn('  [WARNING] Raw database error detected in response!');
    if (hasSecret) console.warn('  [WARNING] Secret detected in response!');
  }
}

runErrorAudit().catch(console.error);
