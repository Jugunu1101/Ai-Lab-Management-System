const mongoose = require('../backend/node_modules/mongoose');
const path = require('path');
const fs = require('fs');

require('../backend/node_modules/dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const Class = require('../backend/src/modules/classes/class.model');
const Assignment = require('../backend/src/modules/assignments/assignment.model');
const Submission = require('../backend/src/modules/submissions/submission.model');
const Progress = require('../backend/src/modules/progress/progress.model');
const Quiz = require('../backend/src/modules/quizzes/quiz.model');
const QuizAttempt = require('../backend/src/modules/quizzes/quizAttempt.model');

const tokens = JSON.parse(fs.readFileSync(path.join(__dirname, 'tokens.json'), 'utf8'));
const studentId = tokens.students[0].id;
const studentObjectId = new mongoose.Types.ObjectId(studentId);

async function inspectIndexes() {
  const dbName = process.env.MONGODB_DB_NAME || 'ai-lab';
  await mongoose.connect(process.env.MONGODB_URI, { dbName });
  console.log('Connected to MongoDB for index audit.');

  console.log('\n--- Existing Indexes in Collections ---');
  const collections = ['classes', 'assignments', 'submissions', 'progresses', 'quizzes', 'quizattempts'];
  for (const colName of collections) {
    const indexes = await mongoose.connection.db.collection(colName).indexes();
    console.log(`\nCollection [${colName}]:`);
    indexes.forEach(idx => console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`));
  }

  console.log('\n--- Explain Plans for Dashboard Queries ---');
  
  // 1. Class.find
  const exp1 = await Class.find({ students: studentObjectId }).select("_id").explain("executionStats");
  console.log(`\n1. Class.find({ students }) stage:`, exp1.queryPlanner.winningPlan.stage, 
    'index:', exp1.queryPlanner.winningPlan.inputStage?.indexName || 'NONE');

  // 2. Submission.find({ userId }).sort({ createdAt: -1 })
  const exp2 = await Submission.find({ userId: studentObjectId }).sort({ createdAt: -1 }).limit(5).explain("executionStats");
  console.log(`2. Submission.find({ userId }).sort(createdAt) stage:`, exp2.queryPlanner.winningPlan.stage, 
    'index:', exp2.queryPlanner.winningPlan.inputStage?.indexName || exp2.queryPlanner.winningPlan.stage);

  // 3. Progress.find({ studentId }).sort({ masteryScore: 1 })
  const exp3 = await Progress.find({ studentId: studentObjectId }).sort({ masteryScore: 1 }).explain("executionStats");
  console.log(`3. Progress.find({ studentId }).sort(masteryScore) stage:`, exp3.queryPlanner.winningPlan.stage,
    'index:', exp3.queryPlanner.winningPlan.inputStage?.indexName || exp3.queryPlanner.winningPlan.stage);

  // 4. Assignment.findOne({ assignedTo, source })
  const exp4 = await Assignment.findOne({ assignedTo: studentObjectId, source: "AI_AGENT" }).sort({ createdAt: -1 }).explain("executionStats");
  console.log(`4. Assignment.findOne({ assignedTo, source }).sort(createdAt) stage:`, exp4.queryPlanner.winningPlan.stage,
    'index:', exp4.queryPlanner.winningPlan.inputStage?.indexName || exp4.queryPlanner.winningPlan.stage);

  // 5. QuizAttempt.findOne
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
  const exp5 = await QuizAttempt.findOne({
    studentId: studentObjectId,
    completedAt: { $gte: startOfDay, $lte: endOfDay },
  }).sort({ completedAt: -1 }).explain("executionStats");
  console.log(`5. QuizAttempt.findOne({ studentId, completedAt }).sort(completedAt) stage:`, exp5.queryPlanner.winningPlan.stage,
    'index:', exp5.queryPlanner.winningPlan.inputStage?.indexName || exp5.queryPlanner.winningPlan.stage);

  await mongoose.disconnect();
}

inspectIndexes().catch(console.error);
