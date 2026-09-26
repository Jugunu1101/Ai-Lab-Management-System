const autocannon = require('autocannon');
const path = require('path');
const fs = require('fs');

const tokens = JSON.parse(fs.readFileSync(path.join(__dirname, 'tokens.json'), 'utf8'));
const defaultStudentToken = tokens.students[0].token;

async function runTier(concurrency, durationSec = 6) {
  console.log(`Testing ${concurrency} Concurrent Users (${durationSec}s)...`);

  const result = await autocannon({
    url: 'http://localhost:3000/api/student/dashboard',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${defaultStudentToken}`,
      'Accept': 'application/json'
    },
    connections: concurrency,
    duration: durationSec,
    pipelining: 1,
    timeout: 20
  });

  const totalReq = result.requests.total;
  const errors = result.errors + result.timeouts;
  const non2xx = result.non2xx;
  const totalFailures = errors + non2xx;
  const errorRate = (totalReq + errors) > 0 ? (totalFailures / (totalReq + errors)) * 100 : 0;

  const tierSummary = {
    concurrentUsers: concurrency,
    requests: totalReq,
    rps: result.requests.average,
    p50: result.latency.p50,
    p90: result.latency.p90,
    p95: result.latency.p97_5 || result.latency.p90,
    p99: result.latency.p99,
    errors: totalFailures,
    errorRate: parseFloat(errorRate.toFixed(2))
  };

  console.log(`  -> Requests=${tierSummary.requests} | RPS=${tierSummary.rps.toFixed(1)} | p50=${tierSummary.p50}ms | p95=${tierSummary.p95}ms | p99=${tierSummary.p99}ms | Errors=${tierSummary.errors} (${tierSummary.errorRate}%)`);
  return tierSummary;
}

async function runRegression() {
  console.log('======================================================================');
  console.log('14. PHASE 7 PERFORMANCE REGRESSION TEST');
  console.log('======================================================================');

  const tiers = [10, 100, 250, 500, 1000];
  const results = [];

  for (const c of tiers) {
    const res = await runTier(c, 6);
    results.push(res);
    await new Promise(r => setTimeout(r, 2000));
  }

  const outPath = path.join(__dirname, 'phase7-regression-results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nRegression test complete. Saved to ${outPath}`);
}

runRegression().catch(console.error);
