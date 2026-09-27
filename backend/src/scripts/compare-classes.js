const mongoose = require('mongoose');
require('dotenv').config();
const Class = require('../modules/classes/class.model');
const Assignment = require('../modules/assignments/assignment.model');
const Submission = require('../modules/submissions/submission.model');
const QuizAttempt = require('../modules/quizzes/quizAttempt.model');
const Progress = require('../modules/progress/progress.model');
const User = require('../modules/users/user.model');
const { generateWeeklyReportData } = require('../modules/reports/reports.service');

async function compareClasses() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME });

  const allClasses = await Class.find().lean();
  console.log(`\nFound ${allClasses.length} total classes in database.`);

  // Group classes by teacher
  const teacherMap = new Map();
  for (const c of allClasses) {
    const tid = c.teacherId ? c.teacherId.toString() : 'NO_TEACHER';
    if (!teacherMap.has(tid)) teacherMap.set(tid, []);
    teacherMap.get(tid).push(c);
  }

  for (const [tid, classes] of teacherMap.entries()) {
    const teacher = await User.findById(tid).lean();
    console.log(`\n========================================================================`);
    console.log(`TEACHER: ${teacher?.name} (${teacher?.email}) | ID: ${tid} | Classes: ${classes.length}`);
    console.log(`========================================================================`);

    for (const c of classes) {
      const studentIds = (c.students || []).map(s => s.toString());
      
      // 1. Direct assignments matching classId as ObjectId and as String
      const asgnsObjId = await Assignment.find({ classId: c._id }).lean();
      const asgnsStr = await Assignment.find({ classId: c._id.toString() }).lean();
      const asgnIds = asgnsObjId.map(a => a._id);

      // 2. Submissions on class assignments
      const subsOnClassAsgns = await Submission.find({ assignmentId: { $in: asgnIds } }).lean();

      // 3. Submissions on class assignments by enrolled students
      const subsEnrolled = await Submission.find({
        assignmentId: { $in: asgnIds },
        userId: { $in: c.students || [] }
      }).lean();

      // 4. Submissions by enrolled students on ANY assignment
      const allStudentSubs = await Submission.find({ userId: { $in: c.students || [] } }).lean();

      // 5. Quiz attempts by enrolled students
      const quizzes = await QuizAttempt.find({ studentId: { $in: c.students || [] } }).lean();

      // 6. Submissions in last 7 days vs all time
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const subsLast7Days = subsEnrolled.filter(s => {
        const d = s.submittedAt || s.createdAt;
        return d >= sevenDaysAgo && d <= now;
      });

      console.log(`\nCLASS: "${c.name}" | ID: ${c._id}`);
      console.log(`  - Students enrolled: ${studentIds.length}`);
      console.log(`  - Assignments with classId (ObjectId): ${asgnsObjId.length} | (String): ${asgnsStr.length}`);
      console.log(`  - Submissions on class assignments: ${subsOnClassAsgns.length}`);
      console.log(`  - Submissions on class assignments by ENROLLED students: ${subsEnrolled.length}`);
      console.log(`  - Submissions by enrolled students on ANY assignment: ${allStudentSubs.length}`);
      console.log(`  - Quiz attempts by enrolled students: ${quizzes.length}`);
      console.log(`  - Submissions within last 7 days: ${subsLast7Days.length}`);

      if (subsEnrolled.length > 0) {
        const dates = subsEnrolled.map(s => (s.submittedAt || s.createdAt).toISOString());
        console.log(`  - Date range of enrolled submissions: ${dates[0]} to ${dates[dates.length - 1]}`);
      }

      if (allStudentSubs.length > subsEnrolled.length) {
        console.log(`  ⚠️ MISMATCH: Enrolled students have ${allStudentSubs.length - subsEnrolled.length} submissions on assignments NOT linked to this classId!`);
        for (const extraSub of allStudentSubs) {
          if (!asgnIds.some(aid => aid.toString() === extraSub.assignmentId.toString())) {
            const extraAsgn = await Assignment.findById(extraSub.assignmentId).lean();
            console.log(`     -> Assignment "${extraAsgn?.title}" (classId: ${extraAsgn?.classId}) vs Class: ${c._id}`);
          }
        }
      }

      if (subsOnClassAsgns.length > subsEnrolled.length) {
        console.log(`  ⚠️ MISMATCH: ${subsOnClassAsgns.length - subsEnrolled.length} submissions exist on this class's assignments by students NOT enrolled in class.students!`);
        for (const orphanedSub of subsOnClassAsgns) {
          if (!studentIds.includes(orphanedSub.userId.toString())) {
            const orphanUser = await User.findById(orphanedSub.userId).lean();
            console.log(`     -> Student: ${orphanUser?.name} (${orphanUser?._id}) not in c.students`);
          }
        }
      }
    }
  }

  await mongoose.disconnect();
}

compareClasses().catch(console.error);
