const mongoose = require("mongoose");
require("dotenv").config();

const Class = require("../modules/classes/class.model");
const User = require("../modules/users/user.model");

const connectDB = require("../config/db");

async function checkOwnership() {
  await connectDB();

  console.log("Connected to MongoDB");

  const classes = await Class.find().lean();
  console.log(`Total classes in database: ${classes.length}`);

  const users = await User.find().lean();
  const userMap = {};
  users.forEach(u => {
    userMap[u._id.toString()] = {
      name: u.name,
      email: u.email,
      role: u.role
    };
  });

  console.log("\n=== ALL CLASSES ===");
  for (const c of classes) {
    const tid = c.teacherId ? c.teacherId.toString() : null;
    const teacher = tid ? userMap[tid] : null;
    console.log(`- Class: "${c.name}" | ID: ${c._id} | Code: ${c.code} | TeacherId: ${tid} | Teacher: ${teacher ? `${teacher.name} (${teacher.email}, ${teacher.role})` : "ORPHAN / NONEXISTENT"}`);
  }

  console.log("\n=== ALL TEACHER USERS ===");
  users.filter(u => u.role === "TEACHER").forEach(t => {
    console.log(`- Teacher: "${t.name}" | ID: ${t._id} | Email: ${t.email}`);
  });

  await mongoose.disconnect();
  process.exit(0);
}

checkOwnership().catch((err) => {
  console.error(err);
  process.exit(1);
});
