const autocannon = require('autocannon');
const path = require('path');
const fs = require('fs');

const tokens = JSON.parse(fs.readFileSync(path.join(__dirname, 'tokens.json'), 'utf8'));
const defaultStudentToken = tokens.students[0].token;

async function runSoakTest(durationSec = 60, connections = 25) {
  console.log(`\n======================================================================`);
  console.log(`PHASE 18 — SOAK TEST (${durationSec} seconds continuous student traffic at ${connections} users)`);
  console.log(`======================================================================`);

  const initialMemory = process.memoryUsage();
  console.log(`Initial RSS: ${(initialMemory.rss / (1024*1024)).toFixed(1)} MB | Heap Used: ${(initialMemory.heapUsed / (1024*1024)).toFixed(1)} MB`);

  const endpoints = [
    '/api/student/dashboard',
    '/api/student/learning-path',
    '/api/assignments',
    '/api/quizzes/today'
  ];

  const results = [];
  const startTimestamp = Date.now();

  // Run continuous traffic cycling across all 4 key read endpoints
  const subDuration = Math.floor(durationSec / endpoints.length);

  for (const ep of endpoints) {
    console.log(`\nSoaking endpoint ${ep} for ${subDuration}s with ${connections} concurrent connections...`);
    const epResult = await autocannon({
      url: `http://localhost:3000${ep}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${defaultStudentToken}`,
        'Accept': 'application/json'
      },
      connections,
      duration: subDuration,
      pipelining: 1,
      timeout: 15
    });

    const currentMem = process.memoryUsage();
    console.log(`-> Completed: Total Req=${epResult.requests.total} | RPS=${epResult.requests.average.toFixed(1)} | p50=${epResult.latency.p50}ms | p95=${epResult.latency.p97_5 || epResult.latency.p90}ms`);
    console.log(`   Current RSS: ${(currentMem.rss / (1024*1024)).toFixed(1)} MB | Heap: ${(currentMem.heapUsed / (1024*1024)).toFixed(1)} MB`);

    results.push({
      endpoint: ep,
      requests: epResult.requests.total,
      rps: epResult.requests.average,
      p50: epResult.latency.p50,
      p95: epResult.latency.p97_5 || epResult.latency.p90,
      errors: epResult.errors + epResult.timeouts,
      non2xx: epResult.non2xx
    });
  }

  const finalMemory = process.memoryUsage();
  const totalElapsed = (Date.now() - startTimestamp) / 1000;
  const rssGrowthMB = ((finalMemory.rss - initialMemory.rss) / (1024*1024)).toFixed(1);
  const heapGrowthMB = ((finalMemory.heapUsed - initialMemory.heapUsed) / (1024*1024)).toFixed(1);

  console.log(`\n======================================================================`);
  console.log(`SOAK TEST COMPLETED in ${totalElapsed.toFixed(1)}s`);
  console.log(`RSS Growth: ${rssGrowthMB} MB | Heap Growth: ${heapGrowthMB} MB`);
  console.log(`Memory Leak Indication: ${Math.abs(parseFloat(heapGrowthMB)) < 50 ? 'NONE (Stable)' : 'POTENTIAL DRIFT'}`);
  console.log(`======================================================================`);

  const summary = {
    durationSec: totalElapsed,
    connections,
    memory: {
      initialRssMB: parseFloat((initialMemory.rss / (1024*1024)).toFixed(1)),
      finalRssMB: parseFloat((finalMemory.rss / (1024*1024)).toFixed(1)),
      rssGrowthMB: parseFloat(rssGrowthMB),
      heapGrowthMB: parseFloat(heapGrowthMB),
      leakDetected: Math.abs(parseFloat(heapGrowthMB)) >= 50
    },
    endpoints: results
  };

  fs.writeFileSync(path.join(__dirname, 'soak-test-results.json'), JSON.stringify(summary, null, 2));
  console.log('Saved soak test results to soak-test-results.json');
}

runSoakTest(60, 20).catch(console.error);
