const autocannon = require('autocannon');
const path = require('path');
const fs = require('fs');

const tokens = JSON.parse(fs.readFileSync(path.join(__dirname, 'tokens.json'), 'utf8'));
const defaultStudentToken = tokens.students[0].token;

async function measureBaseline(endpoint, name) {
  return new Promise((resolve) => {
    autocannon({
      url: `http://localhost:3000${endpoint}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${defaultStudentToken}`,
        'Accept': 'application/json'
      },
      connections: 2,
      amount: 40,
      pipelining: 1,
      timeout: 10
    }, (err, res) => {
      if (err) {
        resolve({ name, p50: 0, p95: 0, p99: 0, errorRate: '100%' });
        return;
      }
      const total = res.requests.total;
      const errors = res.errors + res.timeouts + res.non2xx;
      const rate = total > 0 ? ((errors / total) * 100).toFixed(1) : 0;
      resolve({
        name,
        requests: total,
        p50: res.latency.p50,
        p95: res.latency.p97_5 || res.latency.p90,
        p99: res.latency.p99,
        errorRate: `${rate}%`
      });
    });
  });
}

async function run() {
  console.log(`\n======================================================================`);
  console.log(`COLLECTING BASELINE BENCHMARKS (Light load, 2 connections, 40 requests)`);
  console.log(`======================================================================`);

  const endpoints = [
    { ep: '/api/student/dashboard', name: 'dashboard' },
    { ep: '/api/assignments', name: 'assignments' },
    { ep: '/api/student/learning-path', name: 'learning-path' },
    { ep: '/api/quizzes/today?language=cpp', name: 'quiz' },
    { ep: '/api/submissions', name: 'submissions' }
  ];

  const results = {};
  for (const item of endpoints) {
    process.stdout.write(`Measuring ${item.name}... `);
    const data = await measureBaseline(item.ep, item.name);
    console.log(`p50: ${data.p50}ms | p95: ${data.p95}ms | p99: ${data.p99}ms | Error Rate: ${data.errorRate}`);
    results[item.name] = data;
    await new Promise(r => setTimeout(r, 1500));
  }

  fs.writeFileSync(path.join(__dirname, 'baseline-results.json'), JSON.stringify(results, null, 2));
  console.log('Saved baseline results to baseline-results.json');
}

run().catch(console.error);
