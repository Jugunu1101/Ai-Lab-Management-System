const mongoose = require('../backend/node_modules/mongoose');
const IORedis = require('../backend/node_modules/ioredis');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

require('../backend/node_modules/dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function auditHealth() {
  console.log('======================================================================');
  console.log('1. SYSTEM HEALTH & CONNECTIVITY AUDIT');
  console.log('======================================================================');

  // 1. Backend Health
  try {
    const res = await fetch('http://localhost:3000/health');
    const data = await res.json();
    console.log('[Backend] Status:', res.status, 'Response:', data);
  } catch (err) {
    console.error('[Backend] FAILED:', err.message);
  }

  // 2. AI Service Health
  try {
    const res = await fetch('http://localhost:8000/health');
    const data = await res.json();
    console.log('[AI Service] Status:', res.status, 'Response:', data);
  } catch (err) {
    console.error('[AI Service] FAILED:', err.message);
  }

  // 3. Frontend Accessibility
  try {
    const res = await fetch('http://localhost:5173');
    console.log('[Frontend] Status:', res.status, 'OK:', res.ok, 'Content-Type:', res.headers.get('content-type'));
  } catch (err) {
    console.error('[Frontend] FAILED:', err.message);
  }

  // 4. Redis Connectivity & Queues
  try {
    const redis = new IORedis('redis://localhost:6379', { connectTimeout: 2000, maxRetriesPerRequest: 1 });
    const ping = await redis.ping();
    console.log('[Redis] Ping:', ping);
    const keys = await redis.keys('bull:*');
    console.log(`[Redis] BullMQ keys count: ${keys.length}`);
    await redis.quit();
  } catch (err) {
    console.error('[Redis] FAILED:', err.message);
  }

  // 5. MongoDB Atlas Connectivity
  try {
    const dbName = process.env.MONGODB_DB_NAME || 'ai-lab';
    await mongoose.connect(process.env.MONGODB_URI, { dbName, serverSelectionTimeoutMS: 5000 });
    const adminPing = await mongoose.connection.db.admin().ping();
    console.log('[MongoDB Atlas] Ping:', adminPing);
    await mongoose.disconnect();
  } catch (err) {
    console.error('[MongoDB Atlas] FAILED:', err.message);
  }

  // 6. Docker Container State
  try {
    const dockerPs = execSync('docker ps -a --format "{{.ID}}|{{.Image}}|{{.Status}}|{{.Names}}"', { encoding: 'utf8' });
    console.log('\n[Docker Containers]');
    const lines = dockerPs.trim().split('\n').filter(Boolean);
    lines.forEach(l => console.log(' ', l));

    // Check for orphan code-exec containers
    const orphanExecs = lines.filter(l => l.includes('code-exec'));
    console.log(`\nOrphan code-execution containers: ${orphanExecs.length}`);
  } catch (err) {
    console.error('[Docker] FAILED:', err.message);
  }
}

auditHealth().catch(console.error);
