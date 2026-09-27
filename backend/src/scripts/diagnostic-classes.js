const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../modules/users/user.model');
const Class = require('../modules/classes/class.model');
const Assignment = require('../modules/assignments/assignment.model');
const Submission = require('../modules/submissions/submission.model');
const Progress = require('../modules/progress/progress.model');

async function inspect() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME });
  console.log('Connected to MongoDB');

  const classes = await Class.find().lean();
  console.log(`Total classes in DB: ${classes.length}`);

  // Also check all teachers
  const teachers = await User.find({ role: 'TEACHER' }).lean();
  console.log(`Total teachers: ${teachers.length}`);
  teachers.forEach(t => console.log(`  Teacher: ${t.name} | Email: ${t.email} | ID: ${t._id}`));

  for (const c of classes) {
    const studentCount = (c.students || []).length;
    const assignmentsByClassId = await Assignment.find({ classId: c._id }).lean();
    const assignmentsCount = assignmentsByClassId.length;
    const assignmentIds = assignmentsByClassId.map(a => a._id);

    const submissions = await Submission.find({ assignmentId: { $in: assignmentIds } }).lean();
    const studentSubmissions = await Submission.find({ userId: { $in: c.students || [] } }).lean();

    if (studentCount > 0 || assignmentsCount > 0 || submissions.length > 0) {
      console.log('----------------------------------------------------');
      console.log(`Class: "${c.name}" | ID: ${c._id} | TeacherId: ${c.teacherId}`);
      console.log(`  Students count: ${studentCount}`);
      console.log(`  Assignments count: ${assignmentsCount} (titles: ${assignmentsByClassId.map(a => a.title).join(', ')})`);
      console.log(`  Submissions matching class assignments: ${submissions.length}`);
      console.log(`  Submissions matching enrolled students: ${studentSubmissions.length}`);
      if (studentSubmissions.length > 0 && submissions.length === 0) {
        console.log(`  ⚠️ MISMATCH: Enrolled students have ${studentSubmissions.length} submissions, but ZERO match class assignments!`);
        for (const sub of studentSubmissions) {
          const asgn = await Assignment.findById(sub.assignmentId).lean();
          console.log(`     - Student submission on assignment "${asgn?.title}" (assignment.classId: ${asgn?.classId}) vs c._id: ${c._id}`);
        }
      }
    }
  }

  // Also check all assignments and their classIds
  console.log('\n================ ALL ASSIGNMENTS ================');
  const allAssignments = await Assignment.find().lean();
  for (const a of allAssignments) {
    const c = await Class.findById(a.classId).lean();
    const subs = await Submission.countDocuments({ assignmentId: a._id });
    console.log(`Assignment: "${a.title}" | ID: ${a._id} | classId: ${a.classId} (${c?.name || 'ORPHAN'}) | submissions: ${subs}`);
  }

  await mongoose.disconnect();
}

inspect().catch(console.error);
