const autocannon = require('autocannon');
const path = require('path');
const fs = require('fs');

const tokens = JSON.parse(fs.readFileSync(path.join(__dirname, 'tokens.json'), 'utf8'));
const defaultStudentToken = tokens.students[0].token;

async function runTier(concurrency, durationSec = 10) {
  console.log(`\n----------------------------------------------------------------------`);
  console.log(`RUNNING GRADUAL TIER: ${concurrency} Concurrent Users (${durationSec}s)`);
  console.log(`----------------------------------------------------------------------`);

  const memBefore = process.memoryUsage();

  // Test across mixed student read workload
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
  const memAfter = process.memoryUsage();

  const tierSummary = {
    concurrentUsers: concurrency,
    requests: totalReq,
    rps: result.requests.average,
    p50: result.latency.p50,
    p90: result.latency.p90,
    p95: result.latency.p97_5 || result.latency.p90,
    p99: result.latency.p99,
    errors: totalFailures,
    errorRate: parseFloat(errorRate.toFixed(2)),
    memDeltaMB: Math.round((memAfter.rss - memBefore.rss) / (1024 * 1024))
  };

  console.log(`Tier ${concurrency} Users: Total Requests=${tierSummary.requests} | RPS=${tierSummary.rps.toFixed(1)}`);
  console.log(`Latency: p50=${tierSummary.p50}ms | p90=${tierSummary.p90}ms | p95=${tierSummary.p95}ms | p99=${tierSummary.p99}ms`);
  console.log(`Errors: ${tierSummary.errors} (${tierSummary.errorRate}%) | Memory Delta: ${tierSummary.memDeltaMB} MB`);

  return tierSummary;
}

async function run() {
  console.log(`\n======================================================================`);
  console.log(`PHASE 17 — GRADUAL LOAD ESCALATION (10 -> 50 -> 100 -> 250 -> 500 -> 1000)`);
  console.log(`======================================================================`);

  const concurrencyTiers = [10, 50, 100, 250, 500, 1000];
  const tierResults = [];

  for (const c of concurrencyTiers) {
    const dur = c >= 100 ? 15 : (c >= 50 ? 10 : 8);
    try {
      const summary = await runTier(c, dur);
      tierResults.push(summary);

      if (summary.errorRate > 50) {
        console.warn(`\n[CRITICAL SAFETY TRIGGER] Error rate (${summary.errorRate}%) exceeded safety threshold at ${c} users.`);
        console.warn(`Stopping load escalation to protect MongoDB connection pool and system stability.`);
        break;
      }

      // Cool-down interval between escalations
      console.log(`Cooling down 4s before next tier...`);
      await new Promise(r => setTimeout(r, 4000));
    } catch (err) {
      console.error(`Tier ${c} encountered unhandled failure:`, err.message);
      break;
    }
  }

  const outPath = path.join(__dirname, 'gradual-load-results.json');
  fs.writeFileSync(outPath, JSON.stringify(tierResults, null, 2));
  console.log(`\nSaved gradual load test results to ${outPath}`);
}

run().catch(console.error);
