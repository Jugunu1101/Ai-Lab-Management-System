const autocannon = require('autocannon');
const path = require('path');
const fs = require('fs');

const tokens = JSON.parse(fs.readFileSync(path.join(__dirname, 'tokens.json'), 'utf8'));
const defaultStudentToken = tokens.students[0].token;

async function runAutocannon(url, concurrency, duration = 6) {
  return new Promise((resolve) => {
    const instance = autocannon({
      url,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${defaultStudentToken}`,
        'Accept': 'application/json'
      },
      connections: concurrency,
      duration,
      pipelining: 1,
      timeout: 15
    }, (err, result) => {
      if (err) {
        resolve({
          connections: concurrency,
          requests: 0,
          rps: 0,
          p50: 0,
          p90: 0,
          p95: 0,
          p99: 0,
          errors: concurrency,
          non2xx: 0,
          errorRate: 100,
          err: err.message
        });
        return;
      }

      const totalReq = result.requests.total;
      const errors = result.errors + result.timeouts;
      const non2xx = result.non2xx;
      const totalAttempts = totalReq + errors;
      const errorRate = totalAttempts > 0 ? ((errors + non2xx) / totalAttempts) * 100 : 0;

      resolve({
        connections: concurrency,
        requests: totalReq,
        rps: parseFloat(result.requests.average.toFixed(1)),
        p50: result.latency.p50,
        p90: result.latency.p90,
        p95: result.latency.p97_5 || result.latency.p90,
        p99: result.latency.p99,
        errors: errors + non2xx,
        non2xx,
        errorRate: parseFloat(errorRate.toFixed(2))
      });
    });

    autocannon.track(instance, { renderProgressBar: false, renderResultsTable: false });
  });
}

async function testEndpoint(name, pathUrl, levels = [10, 50, 100, 250, 500, 1000]) {
  console.log(`\n======================================================================`);
  console.log(`BENCHMARKING: ${name} (${pathUrl})`);
  console.log(`======================================================================`);

  const results = [];
  for (const c of levels) {
    process.stdout.write(`Testing ${name} @ ${c} users (6s)... `);
    const res = await runAutocannon(`http://localhost:3000${pathUrl}`, c, 6);
    console.log(`Reqs: ${res.requests} | RPS: ${res.rps} | p50: ${res.p50}ms | p95: ${res.p95}ms | p99: ${res.p99}ms | Err: ${res.errorRate}%`);
    results.push(res);

    if (res.errorRate > 50) {
      console.log(`[Safety Notice] Error rate exceeded 50% at ${c} users. Ceiling reached for ${name}.`);
      break;
    }
    // Cooling period
    await new Promise(r => setTimeout(r, 2000));
  }
  return results;
}

async function run() {
  const allResults = {};

  // Phase 5: Dashboard
  allResults.dashboard = await testEndpoint('Dashboard', '/api/student/dashboard');

  // Phase 6: Learning Path
  allResults.learningPath = await testEndpoint('Learning Path', '/api/student/learning-path');

  // Phase 7: Assignments
  allResults.assignments = await testEndpoint('Assignments', '/api/assignments');

  // Phase 8: Daily Quiz
  allResults.quiz = await testEndpoint('Daily Quiz', '/api/quizzes/today?language=cpp');

  const outPath = path.join(__dirname, 'endpoints-load-results.json');
  fs.writeFileSync(outPath, JSON.stringify(allResults, null, 2));
  console.log(`\nAll endpoints benchmarked! Saved to ${outPath}`);
}

run().catch(console.error);
