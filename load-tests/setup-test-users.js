const mongoose = require('../backend/node_modules/mongoose');
const bcrypt = require('../backend/node_modules/bcryptjs');
const jwt = require('../backend/node_modules/jsonwebtoken');
const fs = require('fs');
const path = require('path');
const dotenv = require('../backend/node_modules/dotenv');
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

async function setup() {
  console.log('Connecting to MongoDB Atlas for Load Test setup...');
  await mongoose.connect(MONGODB_URI, { dbName: 'ai-lab' });
  const db = mongoose.connection.db;

  // 1. Get MIT College
  const college = await db.collection('colleges').findOne({ code: 'MIT' }) ||
                  await db.collection('colleges').findOne({});
  const collegeId = college ? college._id : null;
  console.log(`Using College: ${college?.name || 'Default'} (${collegeId})`);

  const passwordHash = await bcrypt.hash('LoadTest@123', 10);

  // 2. Setup Teacher
  let teacher = await db.collection('users').findOne({ email: 'loadtest_teacher@mit.edu' });
  if (!teacher) {
    const res = await db.collection('users').insertOne({
      name: 'LoadTest Prof. Alan Turing',
      email: 'loadtest_teacher@mit.edu',
      passwordHash,
      role: 'TEACHER',
      collegeId,
      department: 'Computer Science',
      approvalStatus: 'APPROVED',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    teacher = { _id: res.insertedId, name: 'LoadTest Prof. Alan Turing', email: 'loadtest_teacher@mit.edu', role: 'TEACHER', collegeId };
    console.log('Created loadtest teacher:', teacher._id);
  } else {
    console.log('Found existing loadtest teacher:', teacher._id);
  }

  // 3. Setup 10 Students
  const students = [];
  for (let i = 1; i <= 10; i++) {
    const email = `loadtest_student_${i}@student.mit.edu`;
    let student = await db.collection('users').findOne({ email });
    if (!student) {
      const res = await db.collection('users').insertOne({
        name: `LoadTest Student ${i}`,
        email,
        passwordHash,
        role: 'STUDENT',
        collegeId,
        department: 'Computer Science',
        approvalStatus: 'APPROVED',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      student = { _id: res.insertedId, name: `LoadTest Student ${i}`, email, role: 'STUDENT', collegeId };
      console.log(`Created loadtest student ${i}:`, student._id);
    }
    students.push(student);
  }

  // 4. Setup LoadTest Class
  let ltClass = await db.collection('classes').findOne({ code: 'LT2026' });
  if (!ltClass) {
    const res = await db.collection('classes').insertOne({
      name: 'LoadTest High-Concurrency Algorithms',
      code: 'LT2026',
      department: 'Computer Science',
      description: 'Dedicated sandbox class for load testing and concurrency verification',
      teacherId: teacher._id,
      collegeId,
      students: students.map(s => s._id),
      languages: ['cpp', 'python', 'java', 'c'],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    ltClass = { _id: res.insertedId, name: 'LoadTest High-Concurrency Algorithms', code: 'LT2026' };
    console.log('Created loadtest class:', ltClass._id);
  } else {
    console.log('Found existing loadtest class:', ltClass._id);
    // Ensure all students are in class
    await db.collection('classes').updateOne(
      { _id: ltClass._id },
      { $addToSet: { students: { $each: students.map(s => s._id) } } }
    );
  }

  // 5. Setup LoadTest Assignment
  let assignment = await db.collection('assignments').findOne({ title: 'LoadTest Matrix Transpose' });
  if (!assignment) {
    const res = await db.collection('assignments').insertOne({
      title: 'LoadTest Matrix Transpose',
      description: 'Compute the transpose of an N x N matrix.',
      problemStatement: 'Given an integer matrix, return its transpose.',
      programmingLanguage: 'python',
      difficulty: 'EASY',
      classId: ltClass._id,
      teacherId: teacher._id,
      assignedTo: students.map(s => s._id),
      source: 'MANUAL',
      testCases: [
        { input: '[[1,2],[3,4]]', expectedOutput: '[[1,3],[2,4]]', isHidden: false },
        { input: '[[1]]', expectedOutput: '[[1]]', isHidden: true }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    assignment = { _id: res.insertedId, title: 'LoadTest Matrix Transpose' };
    console.log('Created loadtest assignment:', assignment._id);
  } else {
    console.log('Found existing loadtest assignment:', assignment._id);
  }

  // 6. Generate Tokens
  const teacherToken = jwt.sign(
    { userId: teacher._id.toString(), role: teacher.role, collegeId: collegeId?.toString() || null },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  const studentTokens = students.map(s => ({
    id: s._id.toString(),
    name: s.name,
    email: s.email,
    token: jwt.sign(
      { userId: s._id.toString(), role: s.role, collegeId: collegeId?.toString() || null },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )
  }));

  const tokenData = {
    teacher: {
      id: teacher._id.toString(),
      name: teacher.name,
      email: teacher.email,
      token: teacherToken
    },
    students: studentTokens,
    classId: ltClass._id.toString(),
    assignmentId: assignment._id.toString()
  };

  const tokenPath = path.join(__dirname, 'tokens.json');
  fs.writeFileSync(tokenPath, JSON.stringify(tokenData, null, 2));
  console.log(`Saved tokens to ${tokenPath}`);

  await mongoose.disconnect();
  console.log('Load test setup completed successfully!');
}

setup().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
