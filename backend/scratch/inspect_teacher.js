require('dotenv').config();
const { connectDB } = require('../src/config/db');
const Class = require('../src/modules/classes/class.model');
const Submission = require('../src/modules/submissions/submission.model');
const Assignment = require('../src/modules/assignments/assignment.model');

(async () => {
  await connectDB();
  const classes = await Class.find({ teacherId: '6a82ece07d989862b0e50d29' }).lean();
  console.log('CLASSES:', classes.map(c => ({ id: c._id, name: c.name, code: c.code, students: c.students.length })));
  const classIds = classes.map(c => c._id);
  const assignIds = (await Assignment.find({ classId: { $in: classIds } })).map(a => a._id);
  const subs = await Submission.find({ assignmentId: { $in: assignIds } })
    .populate('userId', 'name email')
    .populate('assignmentId', 'title')
    .limit(5)
    .lean();
  console.log('SUBS:', subs.map(s => ({ student: s.userId?.name, assign: s.assignmentId?.title, status: s.status, score: s.score, time: s.createdAt })));
  process.exit(0);
})();
