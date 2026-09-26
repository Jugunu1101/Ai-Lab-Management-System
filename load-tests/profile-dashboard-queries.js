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

async function profile() {
  const dbName = process.env.MONGODB_DB_NAME || 'ai-lab';
  await mongoose.connect(process.env.MONGODB_URI, { dbName });
  console.log('Connected to MongoDB Atlas for profiling.');

  const studentObjectId = new mongoose.Types.ObjectId(studentId);
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
  const now = new Date();

  // Test Round-Trip ping to Atlas
  const pingStart = Date.now();
  await mongoose.connection.db.admin().ping();
  const pingMs = Date.now() - pingStart;
  console.log(`\n[Atlas Network RTT] Ping latency: ${pingMs} ms`);

  async function timeQuery(name, fn) {
    const t0 = Date.now();
    const res = await fn();
    const ms = Date.now() - t0;
    return { name, ms, count: Array.isArray(res) ? res.length : (res ? 1 : 0) };
  }

  console.log('\n--- Profiling Each of the 10 Dashboard Queries ---');
  const q1 = await timeQuery('1. Class.find (enrolled)', () =>
    Class.find({ students: studentObjectId }).select("_id name languages semester").lean()
  );
  const q2 = await timeQuery('2. Submission.countDocuments', () =>
    Submission.countDocuments({ userId: studentObjectId })
  );
  const q3 = await timeQuery('3. Submission.aggregate (avg score)', () =>
    Submission.aggregate([
      { $match: { userId: studentObjectId } },
      { $group: { _id: null, avgScore: { $avg: "$score" } } },
    ])
  );
  const q4 = await timeQuery('4. Submission.find + populate (recent)', () =>
    Submission.find({ userId: studentObjectId })
      .populate("assignmentId", "title language difficulty topics")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()
  );
  const q5 = await timeQuery('5. Progress.find (all mastery)', () =>
    Progress.find({ studentId: studentObjectId }).sort({ masteryScore: 1 }).lean()
  );
  const q6 = await timeQuery('6. QuizAttempt.findOne (today attempt)', () =>
    QuizAttempt.findOne({
      studentId: studentObjectId,
      completedAt: { $gte: startOfDay, $lte: endOfDay },
    }).sort({ completedAt: -1 }).lean()
  );
  const q7 = await timeQuery('7. Quiz.findOne (today quiz)', () =>
    Quiz.findOne({
      $or: [
        { studentId: studentObjectId, createdAt: { $gte: startOfDay, $lte: endOfDay } },
        { targetDate: { $gte: startOfDay, $lte: endOfDay } },
      ],
    }).sort({ createdAt: -1 }).lean()
  );
  const q8 = await timeQuery('8. Assignment.findOne (AI recommended)', () =>
    Assignment.findOne({ assignedTo: studentObjectId, source: "AI_AGENT" }).sort({ createdAt: -1 }).lean()
  );

  const classes = await Class.find({ students: studentObjectId }).select("_id").lean();
  const classIds = classes.map(c => c._id);
  const q9 = await timeQuery('9. Assignment.countDocuments (active)', () =>
    classIds.length > 0
      ? Assignment.countDocuments({ classId: { $in: classIds }, $or: [{ deadline: null }, { deadline: { $gt: now } }] })
      : 0
  );

  const q10 = await timeQuery('10. Submission.findOne (passed AI sub)', () =>
    Submission.findOne({ userId: studentObjectId, status: "PASSED" }).select("_id").lean()
  );

  const queries = [q1, q2, q3, q4, q5, q6, q7, q8, q9, q10];
  console.table(queries);

  const totalSequentialMs = queries.reduce((sum, q) => sum + q.ms, 0);
  console.log(`Total Sequential DB time: ${totalSequentialMs} ms`);

  // Measure combined submission stats query
  const combinedStart = Date.now();
  const combinedStats = await Submission.aggregate([
    { $match: { userId: studentObjectId } },
    {
      $group: {
        _id: null,
        totalSubmissions: { $sum: 1 },
        avgScore: { $avg: "$score" }
      }
    }
  ]);
  const combinedMs = Date.now() - combinedStart;
  console.log(`\n[COMBINED STATS TEST] Combined Submission count + avgScore in 1 query: ${combinedMs} ms (vs ${q2.ms + q3.ms} ms separate)`);

  await mongoose.disconnect();
}

profile().catch(console.error);
