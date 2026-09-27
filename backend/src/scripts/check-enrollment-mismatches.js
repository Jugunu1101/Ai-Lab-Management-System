const mongoose = require('mongoose');
require('dotenv').config();
const Class = require('../modules/classes/class.model');
const Assignment = require('../modules/assignments/assignment.model');
const Submission = require('../modules/submissions/submission.model');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME });
  const classes = await Class.find().lean();
  let mismatches = 0;
  for (const c of classes) {
    const studentIds = (c.students || []).map(s => s.toString());
    const asgns = await Assignment.find({ classId: c._id }).select('_id').lean();
    const asgnIds = asgns.map(a => a._id);
    const subs = await Submission.find({ assignmentId: { $in: asgnIds } }).lean();
    for (const sub of subs) {
      if (!studentIds.includes(sub.userId.toString())) {
        console.log(`Mismatch in "${c.name}" (${c._id}): sub ${sub._id} by user ${sub.userId} NOT in c.students`);
        mismatches++;
      }
    }
  }
  console.log('Total mismatches:', mismatches);
  await mongoose.disconnect();
}
test().catch(console.error);
