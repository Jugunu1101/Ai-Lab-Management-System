const path = require('path');
const fs = require('fs');

const tokens = JSON.parse(fs.readFileSync(path.join(__dirname, 'tokens.json'), 'utf8'));
const teacherToken = tokens.teacher.token;
const classId = tokens.classId;

async function requestAIAssignment(topic, language = 'python', difficulty = 'EASY') {
  const start = Date.now();
  try {
    const res = await fetch('http://localhost:3000/api/assignments/generate-ai', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${teacherToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        topic,
        language,
        difficulty,
        questionCount: 1,
        classId
      })
    });
    const duration = Date.now() - start;
    const json = await res.json();
    return { ok: res.ok, status: res.status, duration, data: json };
  } catch (err) {
    return { ok: false, status: 500, duration: Date.now() - start, error: err.message };
  }
}

async function run() {
  console.log(`\n======================================================================`);
  console.log(`PHASE 10 & 12 — AI QUEUE & AGENT PIPELINE LOAD TEST`);
  console.log(`======================================================================`);

  // Test 1: Single AI Assignment Generation through Teacher API
  console.log(`\n[Test 1] Testing Teacher AI Assignment Generation endpoint...`);
  const singleGen = await requestAIAssignment('arrays', 'python', 'EASY');
  console.log(`-> Status: ${singleGen.status} | Duration: ${singleGen.duration}ms | Success: ${singleGen.ok}`);
  if (singleGen.ok) {
    console.log(`   Generated Assignment Title: "${singleGen.data?.data?.assignment?.title || singleGen.data?.assignment?.title || 'OK'}"`);
  }

  // Test 2: Controlled Concurrent Queue Submissions (3 parallel AI jobs)
  console.log(`\n[Test 2] Testing 3 Concurrent AI Generation Jobs via Pipeline...`);
  const topics = ['strings', 'recursion', 'loops'];
  const startBatch = Date.now();
  const batchResults = await Promise.all(
    topics.map(t => requestAIAssignment(t, 'python', 'EASY'))
  );
  const totalBatchTime = Date.now() - startBatch;
  const successfulJobs = batchResults.filter(r => r.ok).length;
  const avgJobTime = batchResults.reduce((a, b) => a + b.duration, 0) / batchResults.length;

  console.log(`Completed 3 concurrent AI generation requests in ${totalBatchTime}ms`);
  console.log(`Successful: ${successfulJobs}/3 (${(successfulJobs/3*100).toFixed(0)}%)`);
  console.log(`Average turnaround time: ${avgJobTime.toFixed(1)}ms`);

  // Test 3: Inspect Redis Queue Health using bullmq client directly
  console.log(`\n[Test 3] Inspecting BullMQ Queues and Active/Waiting Jobs in Redis...`);
  const { Queue } = require('../backend/node_modules/bullmq');
  const IORedis = require('../backend/node_modules/ioredis');
  const redis = new IORedis('redis://localhost:6379', { maxRetriesPerRequest: null });

  const queueNames = ['code-execution', 'ai-analysis', 'quiz-generation', 'weekly-report', 'agent-decision', 'assignment-generation'];
  const queueStats = {};

  for (const qName of queueNames) {
    const q = new Queue(qName, { connection: redis });
    const waiting = await q.getWaitingCount();
    const active = await q.getActiveCount();
    const completed = await q.getCompletedCount();
    const failed = await q.getFailedCount();
    queueStats[qName] = { waiting, active, completed, failed };
    console.log(`Queue [${qName}]: waiting=${waiting}, active=${active}, completed=${completed}, failed=${failed}`);
    await q.close();
  }

  await redis.quit();

  const summary = {
    singleJob: {
      status: singleGen.status,
      durationMs: singleGen.duration,
      ok: singleGen.ok
    },
    concurrencyBatch: {
      totalJobs: 3,
      successful: successfulJobs,
      totalDurationMs: totalBatchTime,
      avgDurationMs: parseFloat(avgJobTime.toFixed(1))
    },
    queueHealth: queueStats
  };

  fs.writeFileSync(path.join(__dirname, 'ai-queue-load-results.json'), JSON.stringify(summary, null, 2));
  console.log('\nSaved AI queue load results to ai-queue-load-results.json');
}

run().catch(console.error);
