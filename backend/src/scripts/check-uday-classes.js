require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Class = require("../modules/classes/class.model");
const User = require("../modules/users/user.model");

async function checkUdayClasses() {
  await connectDB();
  const uday = await User.findOne({ email: "ji@mit.edu" });
  console.log("Teacher Uday ID:", uday._id);

  const udayClasses = await Class.find({ teacherId: uday._id }).lean();
  console.log(`Uday owns ${udayClasses.length} classes:`);
  for (const c of udayClasses) {
    console.log(` - ID: ${c._id} | Name: "${c.name}" | Code: ${c.code} | Students: ${c.students?.length}`);
  }

  const otherClasses = await Class.find({ teacherId: { $ne: uday._id } }).lean();
  console.log(`Other instructors own ${otherClasses.length} classes.`);

  const nullTeacher = await Class.find({ $or: [{ teacherId: null }, { teacherId: { $exists: false } }] }).lean();
  console.log(`Classes with null/missing teacherId: ${nullTeacher.length}`);

  // Check for orphan classes (where teacherId does not exist in User collection)
  const allTeacherIds = (await User.find({ role: "TEACHER" }).select("_id")).map(u => u._id.toString());
  const orphanClasses = otherClasses.filter(c => c.teacherId && !allTeacherIds.includes(c.teacherId.toString()));
  console.log(`Orphan classes (teacherId not in Users): ${orphanClasses.length}`);
  for (const oc of orphanClasses) {
    console.log(`   * Orphan: "${oc.name}" (ID: ${oc._id}, teacherId: ${oc.teacherId})`);
  }

  process.exit(0);
}

checkUdayClasses().catch(e => { console.error(e); process.exit(1); });
