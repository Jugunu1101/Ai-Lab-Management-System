const mongoose = require('../backend/node_modules/mongoose');
const path = require('path');
const fs = require('fs');
require('../backend/node_modules/dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const Progress = require('../backend/src/modules/progress/progress.model');
const QuizAttempt = require('../backend/src/modules/quizzes/quizAttempt.model');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME || 'ai-lab' });
  await Progress.syncIndexes();
  await QuizAttempt.syncIndexes();
  console.log('Indexes synced successfully.');

  const tokens = JSON.parse(fs.readFileSync(path.join(__dirname, 'tokens.json'), 'utf8'));
  const studentObjectId = new mongoose.Types.ObjectId(tokens.students[0].id);

  const expProgress = await Progress.find({ studentId: studentObjectId }).sort({ masteryScore: 1 }).explain('executionStats');
  console.log('Progress Winning Plan Stage:', expProgress.queryPlanner.winningPlan.stage, 
    'indexName:', expProgress.queryPlanner.winningPlan.inputStage?.indexName);

  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
  const expQuiz = await QuizAttempt.findOne({ 
    studentId: studentObjectId, 
    completedAt: { $gte: startOfDay, $lte: endOfDay } 
  }).sort({ completedAt: -1 }).explain('executionStats');
  console.log('QuizAttempt Winning Plan Stage:', expQuiz.queryPlanner.winningPlan.stage, 
    'indexName:', expQuiz.queryPlanner.winningPlan.inputStage?.indexName);

  await mongoose.disconnect();
}
check().catch(console.error);
