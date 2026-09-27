const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../modules/users/user.model');
const Class = require('../modules/classes/class.model');
const Assignment = require('../modules/assignments/assignment.model');
const Submission = require('../modules/submissions/submission.model');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME });
  const teachers = await User.find({ role: { $in: ['TEACHER', 'ADMIN'] } }).select('name email role');
  for (const t of teachers) {
    const classes = await Class.find({ teacherId: t._id }).lean();
    if (classes.length > 0) {
      console.log('Teacher:', t.name, '(', t.email, ') ID:', t._id);
      for (const c of classes) {
        const asgns = await Assignment.countDocuments({ classId: c._id });
        const asgnIds = (await Assignment.find({ classId: c._id }).select('_id')).map(a => a._id);
        const subs = await Submission.countDocuments({ assignmentId: { $in: asgnIds } });
        console.log('   Class:', c.name, 'ID:', c._id, 'Students:', c.students?.length, 'Assignments:', asgns, 'Submissions on assignments:', subs);
      }
    }
  }
  await mongoose.disconnect();
}
test().catch(console.error);
