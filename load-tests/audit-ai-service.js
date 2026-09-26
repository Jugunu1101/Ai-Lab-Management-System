const AI_URL = 'http://localhost:8000';

async function testAIEndpoint(name, path, payload, expectedStatus = 200) {
  try {
    const res = await fetch(`${AI_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => null);
    const pass = res.status === expectedStatus;
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name.padEnd(35)} -> Status ${res.status} (Expected ${expectedStatus})`);
    return { name, pass, status: res.status, data };
  } catch (err) {
    console.log(`[FAIL] ${name.padEnd(35)} -> Error: ${err.message}`);
    return { name, pass: false, error: err.message };
  }
}

async function runAIAudit() {
  console.log('======================================================================');
  console.log('4. AI SERVICE RELIABILITY AUDIT');
  console.log('======================================================================');

  // 1. Health check
  try {
    const healthRes = await fetch(`${AI_URL}/health`);
    const healthData = await healthRes.json();
    console.log(`[${healthRes.ok ? 'PASS' : 'FAIL'}] ${'AI Health Check'.padEnd(35)} -> Status ${healthRes.status}:`, healthData);
  } catch (err) {
    console.log(`[FAIL] AI Health Check -> ${err.message}`);
  }

  // 2. /ai/analyze-submission
  await testAIEndpoint('AI Analyze Submission', '/ai/analyze-submission', {
    student: { id: '60d0fe4f5311236168a109ca' },
    assignment: { id: 'assign_123', language: 'python', topics: ['loops', 'basics'] },
    submission: { code: 'def add(a, b):\n    return a + b\n' },
    testResults: { passed: 2, failed: 0, total: 2, errors: [] }
  });

  // 3. /ai/generate-quiz
  await testAIEndpoint('AI Generate Quiz', '/ai/generate-quiz', {
    topics: ['arrays'],
    language: 'cpp',
    difficulty: 'medium',
    questionCount: 10
  });

  // 4. /ai/generate-learning-path
  await testAIEndpoint('AI Generate Learning Path', '/ai/generate-learning-path', {
    studentId: '60d0fe4f5311236168a109ca',
    language: 'python',
    mastery: [{ topic: 'basics', score: 85 }, { topic: 'functions', score: 40 }],
    weakTopics: ['functions']
  });

  // 5. /ai/generate-report
  await testAIEndpoint('AI Generate Report', '/ai/generate-report', {
    studentId: '60d0fe4f5311236168a109ca',
    language: 'python',
    mastery: [{ topic: 'basics', score: 85 }],
    weakTopics: ['recursion'],
    passed: 5,
    failed: 1
  });

  // 6. /ai/generate-assignment
  await testAIEndpoint('AI Generate Assignment', '/ai/generate-assignment', {
    topic: 'Binary Search',
    language: 'cpp',
    difficulty: 'MEDIUM',
    context: 'Lab on searching algorithms'
  });

  // 7. /ai/agent/decide
  await testAIEndpoint('AI Agent Decide', '/ai/agent/decide', {
    studentId: '60d0fe4f5311236168a109ca',
    topic: 'recursion',
    masteryScore: 40,
    consecutiveFailures: 2,
    learningVelocity: 0.5
  });

  // 8. Invalid Request Handling (Malformed payload -> 422 Unprocessable Entity)
  await testAIEndpoint('AI Invalid Payload (422)', '/ai/analyze-submission', {
    // Missing required fields
    language: 'unknown_lang'
  }, 422);

  console.log('\n--- AI Endpoint Functional Audit Complete ---');
}

runAIAudit().catch(console.error);
