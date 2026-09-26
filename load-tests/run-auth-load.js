const autocannon = require('autocannon');
const path = require('path');
const fs = require('fs');

async function testAuthConcurrency(connections, duration = 8) {
  console.log(`\n==================================================`);
  console.log(`Testing POST /api/auth/login with ${connections} concurrent users (${duration}s)...`);
  console.log(`==================================================`);

  const result = await autocannon({
    url: 'http://localhost:3000/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'loadtest_student_1@student.mit.edu',
      password: 'LoadTest@123'
    }),
    connections,
    duration,
    pipelining: 1,
    timeout: 15
  });

  const summary = {
    connections,
    requests: result.requests.total,
    rps: result.requests.average,
    p50: result.latency.p50,
    p90: result.latency.p90,
    p95: result.latency.p97_5 || result.latency.p90, // autocannon gives 50, 75, 90, 97.5, 99
    p99: result.latency.p99,
    errors: result.errors,
    timeouts: result.timeouts,
    non2xx: result.non2xx
  };

  console.log(`Requests: ${summary.requests} | RPS: ${summary.rps.toFixed(1)}`);
  console.log(`Latency: p50=${summary.p50}ms | p90=${summary.p90}ms | p95=${summary.p95}ms | p99=${summary.p99}ms`);
  console.log(`Errors: ${summary.errors} | Timeouts: ${summary.timeouts} | Non-2xx: ${summary.non2xx}`);

  return summary;
}

async function run() {
  const concurrencyLevels = [10, 50, 100, 250, 500, 1000];
  const results = [];

  for (const c of concurrencyLevels) {
    try {
      const res = await testAuthConcurrency(c, c >= 500 ? 10 : 8);
      results.push(res);

      // Safety check: if timeouts/errors exceed 50%, pause or stop gradual progression
      const totalAttempted = res.requests + res.errors + res.timeouts;
      const errorRate = totalAttempted > 0 ? (res.errors + res.timeouts + res.non2xx) / totalAttempted : 0;
      if (errorRate > 0.5) {
        console.warn(`[Safety Warning] Error/timeout rate at ${c} users reached ${(errorRate * 100).toFixed(1)}%. Stopping further auth concurrency escalation.`);
        break;
      }
      // Brief cool-down between steps to prevent TCP port exhaustion
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.error(`Failed at concurrency ${c}:`, err.message);
      break;
    }
  }

  const outPath = path.join(__dirname, 'auth-load-results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nSaved auth load results to ${outPath}`);
}

run().catch(console.error);
