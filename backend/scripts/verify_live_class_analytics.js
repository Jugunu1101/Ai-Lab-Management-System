const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const API_BASE = "http://localhost:3000/api";

async function runLiveClassAnalyticsVerification() {
  console.log("=== LIVE API VERIFICATION: CLASS ANALYTICS & TELEMETRY ===");

  await mongoose.connect(process.env.MONGODB_URI, { dbName: "ai-lab" });
  console.log("Connected to MongoDB ai-lab.");

  const db = mongoose.connection.db;

  const timestamp = Date.now();
  const teacherAId = new mongoose.Types.ObjectId();
  const teacherBId = new mongoose.Types.ObjectId();
  const student1Id = new mongoose.Types.ObjectId();
  const student2Id = new mongoose.Types.ObjectId();
  const classDSAId = new mongoose.Types.ObjectId();
  const assignmentId = new mongoose.Types.ObjectId();

  console.log("Creating test users, class 'DSA', and assignments...");
  await db.collection("users").insertMany([
    {
      _id: teacherAId,
      name: "Live Teacher Alpha",
      email: `teacher_alpha_${timestamp}@live.edu`,
      role: "TEACHER",
      passwordHash: "dummyHash",
      approvalStatus: "APPROVED",
    },
    {
      _id: teacherBId,
      name: "Live Teacher Beta (Rival)",
      email: `teacher_beta_${timestamp}@live.edu`,
      role: "TEACHER",
      passwordHash: "dummyHash",
      approvalStatus: "APPROVED",
    },
    {
      _id: student1Id,
      name: "Live Student Alice",
      email: `student_alice_${timestamp}@live.edu`,
      role: "STUDENT",
      passwordHash: "dummyHash",
      approvalStatus: "APPROVED",
    },
    {
      _id: student2Id,
      name: "Live Student Bob",
      email: `student_bob_${timestamp}@live.edu`,
      role: "STUDENT",
      passwordHash: "dummyHash",
      approvalStatus: "APPROVED",
    },
  ]);

  await db.collection("classes").insertOne({
    _id: classDSAId,
    name: "DSA",
    teacherId: teacherAId,
    students: [student1Id, student2Id],
    languages: ["python"],
  });

  await db.collection("assignments").insertOne({
    _id: assignmentId,
    title: "Binary Trees & Loops",
    description: "Implement tree traversal using loops",
    language: "python",
    difficulty: "EASY",
    classId: classDSAId,
    createdBy: teacherAId,
    topics: ["Loops", "Trees"],
  });

  const teacherAToken = jwt.sign(
    { userId: teacherAId.toString(), role: "TEACHER" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  const teacherBToken = jwt.sign(
    { userId: teacherBId.toString(), role: "TEACHER" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  try {
    // 1. Initial State: No submissions yet
    console.log("\n[STEP 1] Querying DSA analytics with zero submissions (Empty State)...");
    const resEmpty = await fetch(`${API_BASE}/analytics/class/${classDSAId}`, {
      headers: { Authorization: `Bearer ${teacherAToken}` },
    });
    console.log("Status:", resEmpty.status);
    const dataEmpty = (await resEmpty.json()).data;
    console.log("Empty Response Data:", {
      hasData: dataEmpty.hasData,
      classAverage: dataEmpty.classAverage,
      medianStudentScore: dataEmpty.medianStudentScore,
      weakTopicCount: dataEmpty.weakTopicCount,
    });

    if (dataEmpty.hasData !== false || dataEmpty.classAverage !== null || dataEmpty.medianStudentScore !== null) {
      throw new Error("Expected empty state to have hasData: false, classAverage: null, medianStudentScore: null");
    }
    console.log("✓ Empty state correctly returns hasData: false and null averages (Not fake 0%)");

    // 2. Student Alice submits with 80%, Student Bob submits with 60%
    console.log("\n[STEP 2] Inserting real submissions (Alice: 80%, Bob: 60%)...");
    const sub1Id = new mongoose.Types.ObjectId();
    const sub2Id = new mongoose.Types.ObjectId();

    await db.collection("submissions").insertMany([
      {
        _id: sub1Id,
        assignmentId,
        userId: student1Id,
        code: "def solve(): pass",
        language: "python",
        status: "PASSED",
        score: 80,
        attemptNumber: 1,
        createdAt: new Date(),
      },
      {
        _id: sub2Id,
        assignmentId,
        userId: student2Id,
        code: "def solve(): pass",
        language: "python",
        status: "PASSED",
        score: 60,
        attemptNumber: 1,
        createdAt: new Date(),
      },
    ]);

    // Add progress records: Loops = 42% (weak), Trees = 75% (not weak)
    await db.collection("progresses").insertMany([
      {
        studentId: student1Id,
        topic: "Loops",
        language: "python",
        masteryScore: 40,
        lastPracticedAt: new Date(),
      },
      {
        studentId: student2Id,
        topic: "Loops",
        language: "python",
        masteryScore: 44,
        lastPracticedAt: new Date(),
      },
      {
        studentId: student1Id,
        topic: "Trees",
        language: "python",
        masteryScore: 75,
        lastPracticedAt: new Date(),
      },
    ]);

    // 3. Query DSA Analytics
    console.log("\n[STEP 3] Querying DSA class analytics with real data...");
    const resReal = await fetch(`${API_BASE}/analytics/class/${classDSAId}`, {
      headers: { Authorization: `Bearer ${teacherAToken}` },
    });
    console.log("Status:", resReal.status);
    const dataReal = (await resReal.json()).data;
    console.log("Live Analytics Result:", {
      className: dataReal.className,
      hasData: dataReal.hasData,
      classAverage: dataReal.classAverage,
      medianStudentScore: dataReal.medianStudentScore,
      weakTopicCount: dataReal.weakTopicCount,
      weakTopicHotspots: dataReal.weakTopicHotspots,
      scoreDistribution: dataReal.scoreDistribution,
      topicMasteryComparison: dataReal.topicMasteryComparison,
    });

    // Check Class Average: (80 + 60) / 2 = 70%
    if (dataReal.classAverage !== 70) {
      throw new Error(`Expected classAverage: 70, got ${dataReal.classAverage}`);
    }

    // Check Median: (80 + 60) / 2 = 70%
    if (dataReal.medianStudentScore !== 70) {
      throw new Error(`Expected medianStudentScore: 70, got ${dataReal.medianStudentScore}`);
    }

    // Check Weak Topics: Loops avg = (40 + 44) / 2 = 42% (< 50% -> weak)
    // Trees avg = 75% (>= 50% -> not weak)
    if (dataReal.weakTopicCount !== 1) {
      throw new Error(`Expected weakTopicCount: 1, got ${dataReal.weakTopicCount}`);
    }
    if (dataReal.weakTopicHotspots[0].topic.toLowerCase() !== "loops" || dataReal.weakTopicHotspots[0].score !== 42) {
      throw new Error(`Weak topic hotspot mismatch: ${JSON.stringify(dataReal.weakTopicHotspots)}`);
    }
    console.log("✓ Class Average (70%), Median (70%), and Weak Topics (Loops: 42%) verified!");

    // 4. Test Teacher Isolation: Teacher B attempts to query Teacher A's DSA class
    console.log("\n[STEP 4] Verifying Teacher Isolation (Teacher B requests DSA class)...");
    const resForbidden = await fetch(`${API_BASE}/analytics/class/${classDSAId}`, {
      headers: { Authorization: `Bearer ${teacherBToken}` },
    });
    console.log("Status:", resForbidden.status);
    if (resForbidden.status !== 403) {
      throw new Error(`Expected 403 Forbidden for unauthorized teacher, got ${resForbidden.status}`);
    }
    console.log("✓ Teacher isolation strictly enforced (403 Forbidden)");

    // 5. Test Dynamic Update: Bob resubmits with score 100% -> Bob's best score becomes 100%
    // Class scores become Alice: 80, Bob: 100 -> Average = 90%, Median = 90%
    console.log("\n[STEP 5] Testing Dynamic Update: Bob resubmits with score 100%...");
    await db.collection("submissions").insertOne({
      assignmentId,
      userId: student2Id,
      code: "def solve(): return True",
      language: "python",
      status: "PASSED",
      score: 100,
      attemptNumber: 2,
      createdAt: new Date(),
    });

    const resUpdated = await fetch(`${API_BASE}/analytics/class/${classDSAId}`, {
      headers: { Authorization: `Bearer ${teacherAToken}` },
    });
    const dataUpdated = (await resUpdated.json()).data;
    console.log("Updated Analytics Result:", {
      classAverage: dataUpdated.classAverage,
      medianStudentScore: dataUpdated.medianStudentScore,
    });

    if (dataUpdated.classAverage !== 90 || dataUpdated.medianStudentScore !== 90) {
      throw new Error(`Expected updated classAverage: 90, median: 90; got avg: ${dataUpdated.classAverage}, median: ${dataUpdated.medianStudentScore}`);
    }
    console.log("✓ Real-time / dynamic update verified (Alice: 80, Bob: 100 -> Avg: 90%, Median: 90%)!");

    console.log("\n=== ALL LIVE CLASS ANALYTICS VERIFICATIONS PASSED SUCCESSFULLY! ===");
  } finally {
    console.log("\nCleaning up live test entities...");
    await db.collection("users").deleteMany({ _id: { $in: [teacherAId, teacherBId, student1Id, student2Id] } });
    await db.collection("classes").deleteOne({ _id: classDSAId });
    await db.collection("assignments").deleteOne({ _id: assignmentId });
    await db.collection("submissions").deleteMany({ assignmentId });
    await db.collection("progresses").deleteMany({ studentId: { $in: [student1Id, student2Id] } });
    await mongoose.disconnect();
    console.log("Cleanup complete and disconnected from DB.");
  }
}

runLiveClassAnalyticsVerification().catch((err) => {
  console.error("LIVE CLASS ANALYTICS VERIFICATION FAILED:", err);
  process.exit(1);
});
