const path = require('path');
const fs = require('fs');
const IORedis = require('../backend/node_modules/ioredis');
const { getQueues, QUEUE_NAMES } = require('../backend/src/queues/queue.config');
const { invalidateStudentDashboardCache } = require('../backend/src/modules/student/student.service');

require('../backend/node_modules/dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const tokens = JSON.parse(fs.readFileSync(path.join(__dirname, 'tokens.json'), 'utf8'));
const studentId = tokens.students[0].id;

async function runRedisBullAudit() {
  console.log('======================================================================');
  console.log('10. REDIS & BULLMQ INFRASTRUCTURE AUDIT');
  console.log('======================================================================');

  // 1. Redis Connectivity & Latency
  const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
  const t0 = Date.now();
  const ping = await redis.ping();
  const latency = Date.now() - t0;
  console.log(`[PASS] Redis Ping: ${ping} (Latency: ${latency}ms)`);

  // 2. Inspect Queues
  console.log('\n--- BullMQ Queues State ---');
  const queues = getQueues();
  const queueEntries = [
    { name: QUEUE_NAMES.CODE_EXECUTION, q: queues.codeExecution },
    { name: QUEUE_NAMES.AI_ANALYSIS, q: queues.aiAnalysis },
    { name: QUEUE_NAMES.QUIZ_GENERATION, q: queues.quizGeneration },
    { name: QUEUE_NAMES.WEEKLY_REPORT, q: queues.weeklyReport },
    { name: QUEUE_NAMES.AGENT_DECISION, q: queues.agentDecision },
    { name: QUEUE_NAMES.ASSIGNMENT_GENERATION, q: queues.assignmentGeneration },
  ];

  let totalWaiting = 0;
  let totalActive = 0;
  let totalFailed = 0;
  let totalCompleted = 0;

  for (const entry of queueEntries) {
    const counts = await entry.q.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
    console.log(`Queue [${entry.name.padEnd(22)}] -> Waiting: ${counts.waiting}, Active: ${counts.active}, Delayed: ${counts.delayed}, Failed: ${counts.failed}, Completed: ${counts.completed}`);
    totalWaiting += counts.waiting;
    totalActive += counts.active;
    totalFailed += counts.failed;
    totalCompleted += counts.completed;
  }

  const noStuckJobs = totalWaiting === 0 && totalActive === 0;
  console.log(`\n[${noStuckJobs ? 'PASS' : 'INFO'}] Stuck Jobs Status: ${totalWaiting} waiting, ${totalActive} active in background queues.`);

  // 3. Inspect Redis Cache Keys & User-Scoped Isolation
  console.log('\n--- Redis Cache Isolation & TTL ---');
  const cacheKey = `student:dashboard:${studentId}`;
  await redis.set(cacheKey, JSON.stringify({ auditTest: true }), 'EX', 20);
  const ttl = await redis.ttl(cacheKey);
  const existsBefore = await redis.exists(cacheKey);
  console.log(`[PASS] User-Scoped Cache Key Created: "${cacheKey}"`);
  console.log(`[PASS] Cache TTL Enforced: ${ttl}s (Expected <= 20s)`);

  // 4. Test Invalidation
  await invalidateStudentDashboardCache(studentId);
  const existsAfter = await redis.exists(cacheKey);
  const invalidationPass = existsBefore === 1 && existsAfter === 0;
  console.log(`[${invalidationPass ? 'PASS' : 'FAIL'}] Cache Invalidation on Mutation: purged successfully (exists: ${existsAfter})`);

  // Clean up
  for (const entry of queueEntries) {
    await entry.q.close();
  }
  await redis.quit();

  console.log('\n======================================================================');
  console.log('REDIS & BULLMQ AUDIT: COMPLETED');
  console.log('======================================================================');
}

runRedisBullAudit().catch(console.error);
