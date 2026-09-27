const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../modules/users/user.model');
const Class = require('../modules/classes/class.model');
const Assignment = require('../modules/assignments/assignment.model');
const Submission = require('../modules/submissions/submission.model');
const WeeklyReport = require('../modules/reports/weeklyReport.model');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME });
  const allUsers = await User.find({ role: { $in: ['TEACHER', 'ADMIN'] } }).lean();
  console.log(`Found ${allUsers.length} TEACHER/ADMIN users.`);
  
  for (const u of allUsers) {
    const classes = await Class.find({ teacherId: u._id }).lean();
    if (classes.length > 0) {
      console.log(`\n======================================================`);
      console.log(`User: ${u.name} | Email: ${u.email} | Role: ${u.role} | ID: ${u._id}`);
      console.log(`Classes (${classes.length}):`);
      for (const c of classes) {
        const asgns = await Assignment.find({ classId: c._id }).lean();
        const asgnIds = asgns.map(a => a._id);
        const subs = await Submission.find({ assignmentId: { $in: asgnIds } }).lean();
        const reports = await WeeklyReport.find({ classId: c._id }).lean();
        console.log(`  - Class: "${c.name}" | ID: ${c._id}`);
        console.log(`    Students: ${(c.students || []).length} | Assignments: ${asgns.length} | Submissions: ${subs.length} | Reports: ${reports.length}`);
        if (subs.length > 0) {
          const dates = subs.map(s => s.submittedAt || s.createdAt).sort();
          console.log(`    Submissions range: ${dates[0]?.toISOString()} to ${dates[dates.length - 1]?.toISOString()}`);
        }
      }
    }
  }

  // Also check if there are any classes without teacherId or teacherId not in TEACHER/ADMIN
  const orphanClasses = await Class.find({ teacherId: { $nin: allUsers.map(u => u._id) } }).lean();
  console.log(`\nOrphan classes count: ${orphanClasses.length}`);
  for (const oc of orphanClasses) {
    console.log(`  - Orphan Class: "${oc.name}" | ID: ${oc._id} | TeacherId: ${oc.teacherId}`);
  }

  // Check all weekly reports in database
  console.log(`\n================ WEEKLY REPORTS IN DB ================`);
  const allReports = await WeeklyReport.find().lean();
  console.log(`Total Weekly Reports in DB: ${allReports.length}`);
  for (const r of allReports) {
    console.log(`Report ID: ${r._id} | Class: "${r.className}" (${r.classId}) | Period: ${r.weekStart?.toISOString()} to ${r.weekEnd?.toISOString()} | Subs: ${r.statistics?.totalSubmissions} | Active: ${r.statistics?.activeStudents}`);
  }

  await mongoose.disconnect();
}
run().catch(console.error);
