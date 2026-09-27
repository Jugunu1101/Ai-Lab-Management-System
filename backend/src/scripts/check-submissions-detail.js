const mongoose = require('mongoose');
require('dotenv').config();
const Class = require('../modules/classes/class.model');
const Assignment = require('../modules/assignments/assignment.model');
const Submission = require('../modules/submissions/submission.model');
const User = require('../modules/users/user.model');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME });
  const classes = await Class.find({ name: { $in: ['DSA', 'c++', 'Advanced Programming', 'LoadTest High-Concurrency Algorithms', 'Hackathon Demo Lab 6086'] } }).lean();
  for (const c of classes) {
    console.log('==============================================');
    const teacher = await User.findById(c.teacherId).lean();
    console.log(`Class: "${c.name}" | ID: ${c._id} | Teacher: ${teacher?.email} (${teacher?._id})`);
    console.log(`Students count: ${(c.students || []).length}: ${c.students}`);
    const asgns = await Assignment.find({ classId: c._id }).lean();
    console.log('Assignments count:', asgns.length);
    for (const a of asgns) {
      console.log(`   Asgn: "${a.title}" | ID: ${a._id} | topics: ${a.topics} | lang: ${a.language}`);
      const subs = await Submission.find({ assignmentId: a._id }).lean();
      console.log(`      Submissions on this assignment: ${subs.length}`);
      for (const s of subs) {
        const student = await User.findById(s.userId).lean();
        const isEnrolled = (c.students || []).some(id => id.toString() === s.userId.toString());
        console.log(`        Sub ID: ${s._id} | user: ${student?.name} (${s.userId}) | enrolled in class? ${isEnrolled} | score: ${s.score} | status: ${s.status} | createdAt: ${s.createdAt?.toISOString()} | submittedAt: ${s.submittedAt?.toISOString()}`);
      }
    }
  }
  await mongoose.disconnect();
}
test().catch(console.error);
