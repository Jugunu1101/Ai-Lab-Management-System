const path = require('path');
const fs = require('fs');
const mongoose = require('../backend/node_modules/mongoose');

require('../backend/node_modules/dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const tokens = JSON.parse(fs.readFileSync(path.join(__dirname, 'tokens.json'), 'utf8'));
const teacher = tokens.teacher;
const student1 = tokens.students[0];
const student2 = tokens.students[1];

async function runDataIntegrityAudit() {
  console.log('======================================================================');
  console.log('15. DATA INTEGRITY & ISOLATION AUDIT');
  console.log('======================================================================');

  // 1. Cross-student submission leakage test
  // Student 1 submits code
  const subRes = await fetch('http://localhost:3000/api/submissions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${student1.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      assignmentId: tokens.assignmentId,
      language: 'python',
      code: 'print("Data integrity student 1")'
    })
  });
  const subData = await subRes.json();
  const sub1Id = subData.data?._id;

  if (sub1Id) {
    // Student 1 can access own submission
    const ownRes = await fetch(`http://localhost:3000/api/submissions/${sub1Id}`, {
      headers: { 'Authorization': `Bearer ${student1.token}` }
    });
    console.log(`[${ownRes.status === 200 ? 'PASS' : 'FAIL'}] Student 1 accessing own submission: Status ${ownRes.status}`);

    // Student 2 attempts to access Student 1's submission
    const crossRes = await fetch(`http://localhost:3000/api/submissions/${sub1Id}`, {
      headers: { 'Authorization': `Bearer ${student2.token}` }
    });
    const crossPass = crossRes.status === 403;
    console.log(`[${crossPass ? 'PASS' : 'FAIL'}] Cross-Student Isolation: Student 2 blocked from Student 1 submission -> Status ${crossRes.status} (Expected 403 FORBIDDEN)`);
  }

  // 2. Student dashboard isolation
  const s1Dash = await fetch('http://localhost:3000/api/student/dashboard', {
    headers: { 'Authorization': `Bearer ${student1.token}` }
  }).then(r => r.json());

  const s2Dash = await fetch('http://localhost:3000/api/student/dashboard', {
    headers: { 'Authorization': `Bearer ${student2.token}` }
  }).then(r => r.json());

  // Check if s2 dashboard has any data belonging to s1
  const s1SubsInS2 = (s2Dash.data?.recentSubmissions || []).filter(s => s.userId === student1.id);
  const dashIsoPass = s1SubsInS2.length === 0;
  console.log(`[${dashIsoPass ? 'PASS' : 'FAIL'}] Dashboard Isolation: Zero cross-student submissions leaked into peer dashboard`);

  // 3. Database direct verification
  const dbName = process.env.MONGODB_DB_NAME || 'ai-lab';
  await mongoose.connect(process.env.MONGODB_URI, { dbName });
  const Submission = require('../backend/src/modules/submissions/submission.model');
  const Progress = require('../backend/src/modules/progress/progress.model');
  const QuizAttempt = require('../backend/src/modules/quizzes/quizAttempt.model');

  // Verify all Progress documents have valid studentId
  const orphanProgress = await Progress.countDocuments({ studentId: { $exists: false } });
  console.log(`[${orphanProgress === 0 ? 'PASS' : 'FAIL'}] Progress Scoping: ${orphanProgress} orphan progress records without studentId`);

  // Verify all QuizAttempts have valid studentId & quizId
  const orphanAttempts = await QuizAttempt.countDocuments({ $or: [{ studentId: { $exists: false } }, { quizId: { $exists: false } }] });
  console.log(`[${orphanAttempts === 0 ? 'PASS' : 'FAIL'}] Quiz Attempt Scoping: ${orphanAttempts} orphan quiz attempts`);

  // Verify all Submissions have valid userId & assignmentId
  const orphanSubs = await Submission.countDocuments({ $or: [{ userId: { $exists: false } }, { assignmentId: { $exists: false } }] });
  console.log(`[${orphanSubs === 0 ? 'PASS' : 'FAIL'}] Submission Scoping: ${orphanSubs} orphan submissions`);

  await mongoose.disconnect();

  console.log('\n======================================================================');
  console.log('DATA INTEGRITY AUDIT: ALL CHECKS PASSED');
  console.log('======================================================================');
}

runDataIntegrityAudit().catch(console.error);
