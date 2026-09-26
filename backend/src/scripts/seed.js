require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../modules/users/user.model");
const Class = require("../modules/classes/class.model");
const Assignment = require("../modules/assignments/assignment.model");
const College = require("../modules/colleges/college.model");
const { seedDefaultColleges } = require("../config/seedColleges");

const seedDatabase = async () => {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/programming_lab";
  const dbName = process.env.MONGODB_DB_NAME || "ai-lab";

  console.log(`Connecting to MongoDB (${uri})...`);
  await mongoose.connect(uri, { dbName });
  console.log("Connected.");
  
  await seedDefaultColleges();
  const mit = await College.findOne({ code: "MIT" });
  const stanford = await College.findOne({ code: "STANFORD" });
  const apex = await College.findOne({ code: "APEX" });

  try {
    const seedPassword = process.env.DEFAULT_SEED_PASSWORD || "Password@123";
    const passwordHash = await bcrypt.hash(seedPassword, 12);

    // 1. Seed Admin
    let admin = await User.findOne({ email: "admin@lab.edu" });
    if (!admin) {
      admin = await User.create({
        name: "System Administrator",
        email: "admin@lab.edu",
        passwordHash,
        role: "ADMIN",
        collegeId: mit ? mit._id : null,
        department: "Administration",
      });
      console.log("Created Admin: admin@lab.edu");
    } else {
      console.log("Admin already exists: admin@lab.edu");
    }

    // 2. Seed Teacher
    let teacher = await User.findOne({ email: "teacher@lab.edu" });
    if (!teacher) {
      teacher = await User.create({
        name: "Dr. Alan Turing",
        email: "teacher@lab.edu",
        passwordHash,
        role: "TEACHER",
        collegeId: mit ? mit._id : null,
        department: "Computer Science",
      });
      console.log("Created Teacher: teacher@lab.edu");
    } else {
      console.log("Teacher already exists: teacher@lab.edu");
    }

    // 3. Seed Student
    let student = await User.findOne({ email: "student@lab.edu" });
    if (!student) {
      student = await User.create({
        name: "Ada Lovelace",
        email: "student@lab.edu",
        passwordHash,
        role: "STUDENT",
        collegeId: apex ? apex._id : null,
        department: "Computer Science",
      });
      console.log("Created Student: student@lab.edu");
    } else {
      console.log("Student already exists: student@lab.edu");
    }

    // Seed Haiku user
    let haiku = await User.findOne({ email: "haiku@mit.edu" });
    if (!haiku) {
      haiku = await User.create({
        name: "Haiku AI",
        email: "haiku@mit.edu",
        passwordHash,
        role: "STUDENT",
        collegeId: mit ? mit._id : null,
        department: "AI & Robotics",
      });
      console.log("Created Student: haiku@mit.edu");
    } else {
      console.log("Student already exists: haiku@mit.edu");
    }

    // 4. Seed Class
    let sampleClass = await Class.findOne({ name: "CS101: Data Structures & Algorithms" });
    if (!sampleClass) {
      sampleClass = await Class.create({
        name: "CS101: Data Structures & Algorithms",
        teacherId: teacher._id,
        students: [student._id, haiku._id],
        languages: ["javascript", "python", "cpp", "java"],
        semester: "Fall 2026",
      });
      console.log("Created Sample Class: CS101");
    } else {
      if (!sampleClass.students.includes(student._id)) {
        sampleClass.students.push(student._id);
      }
      if (!sampleClass.students.includes(haiku._id)) {
        sampleClass.students.push(haiku._id);
      }
      await sampleClass.save();
      console.log("Class already exists: CS101");
    }

    // 5. Seed Assignment
    let assignment = await Assignment.findOne({ title: "Find Double of Number" });
    if (!assignment) {
      assignment = await Assignment.create({
        title: "Find Double of Number",
        description: "Read an integer from standard input (stdin) and print its double (number * 2) to standard output (stdout).",
        language: "javascript",
        difficulty: "EASY",
        topics: ["basics", "io", "arithmetic"],
        testCases: [
          { input: "5", expectedOutput: "10", isHidden: false },
          { input: "0", expectedOutput: "0", isHidden: false },
          { input: "-3", expectedOutput: "-6", isHidden: true },
          { input: "100", expectedOutput: "200", isHidden: true },
        ],
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        classId: sampleClass._id,
        createdBy: teacher._id,
      });
      console.log("Created Sample Assignment: Find Double of Number");
    } else {
      console.log("Assignment already exists: Find Double of Number");
    }

    console.log("\n========================================================");
    console.log(" DATABASE SEEDING COMPLETED SUCCESSFULLY!");
    console.log("========================================================");
    console.log("Demo Credentials (Password for all: Password@123)");
    console.log("- Admin:   admin@lab.edu");
    console.log("- Teacher: teacher@lab.edu");
    console.log("- Student: student@lab.edu");
    console.log("- Student: haiku@mit.edu");
    console.log("========================================================\n");
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
};

seedDatabase();
