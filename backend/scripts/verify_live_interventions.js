const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const API_BASE = "http://localhost:3000/api";

async function runLiveVerification() {
  console.log("=== LIVE API VERIFICATION: AI LEARNING INTERVENTIONS ===");

  await mongoose.connect(process.env.MONGODB_URI, { dbName: "ai-lab" });
  console.log("Connected to MongoDB ai-lab.");

  const db = mongoose.connection.db;

  // 1. Create clean test entities
  const teacher1Id = new mongoose.Types.ObjectId();
  const teacher2Id = new mongoose.Types.ObjectId();
  const studentId = new mongoose.Types.ObjectId();
  const classId = new mongoose.Types.ObjectId();

  await db.collection("users").insertMany([
    {
      _id: teacher1Id,
      name: "Live Teacher One",
      email: `teacher1_${Date.now()}@live.edu`,
      role: "TEACHER",
      passwordHash: "dummy",
    },
    {
      _id: teacher2Id,
      name: "Live Teacher Two (Unrelated)",
      email: `teacher2_${Date.now()}@live.edu`,
      role: "TEACHER",
      passwordHash: "dummy",
    },
    {
      _id: studentId,
      name: "Live Student Alice",
      email: `student_${Date.now()}@live.edu`,
      role: "STUDENT",
      passwordHash: "dummy",
    },
  ]);

  await db.collection("classes").insertOne({
    _id: classId,
    name: "Live CS101",
    teacherId: teacher1Id,
    students: [studentId],
  });

  const teacher1Token = jwt.sign(
    { userId: teacher1Id.toString(), role: "TEACHER" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  const teacher2Token = jwt.sign(
    { userId: teacher2Id.toString(), role: "TEACHER" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  const studentToken = jwt.sign(
    { userId: studentId.toString(), role: "STUDENT" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  try {
    // TEST 1: Unauthenticated request rejected with 401
    console.log("\n[TEST 1] Unauthenticated request to /api/ai/interventions...");
    const resUnauth = await fetch(`${API_BASE}/ai/interventions`);
    console.log("Status:", resUnauth.status);
    if (resUnauth.status !== 401) throw new Error("Expected 401 for unauthenticated request");
    console.log("✓ Correctly rejected with 401 Unauthorized");

    // TEST 2: Student request rejected with 403
    console.log("\n[TEST 2] Student request to /api/ai/interventions...");
    const resStudent = await fetch(`${API_BASE}/ai/interventions`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    console.log("Status:", resStudent.status);
    if (resStudent.status !== 403) throw new Error("Expected 403 for student request");
    console.log("✓ Correctly rejected with 403 Forbidden");

    // TEST 3: Teacher 1 empty state
    console.log("\n[TEST 3] Teacher 1 initial empty state...");
    const resEmpty = await fetch(`${API_BASE}/ai/interventions`, {
      headers: { Authorization: `Bearer ${teacher1Token}` },
    });
    const dataEmpty = await resEmpty.json();
    console.log("Status:", resEmpty.status, "Data:", JSON.stringify(dataEmpty));
    if (resEmpty.status !== 200 || dataEmpty.data.interventions.length !== 0) {
      throw new Error("Expected empty interventions array");
    }
    console.log("✓ Empty state returned correctly with 200 OK");

    // TEST 4: Record a real intervention via service (e.g. from quiz or assignment deficit)
    console.log("\n[TEST 4] Recording real intervention for Student Alice in Loops...");
    const { recordIntervention } = require("../src/modules/ai/aiIntervention.service");

    const interventionDoc = await recordIntervention({
      studentId: studentId.toString(),
      classId: classId.toString(),
      type: "WEAK_TOPIC",
      topic: "Loops",
      language: "python",
      reason: "Low quiz score (35%) in loop boundaries",
      recommendation: "Practice while loops and off-by-one boundary checks",
      previousScore: 35,
      source: "QUIZ",
    });
    console.log("Intervention created with ID:", interventionDoc._id);

    // TEST 5: Teacher 1 retrieves intervention history
    console.log("\n[TEST 5] Teacher 1 retrieves intervention history...");
    const resT1 = await fetch(`${API_BASE}/ai/interventions`, {
      headers: { Authorization: `Bearer ${teacher1Token}` },
    });
    const dataT1 = await resT1.json();
    console.log("Status:", resT1.status);
    console.log("Retrieved Interventions:", dataT1.data.interventions);
    if (dataT1.data.interventions.length !== 1) {
      throw new Error(`Expected 1 intervention, got ${dataT1.data.interventions.length}`);
    }
    const item = dataT1.data.interventions[0];
    if (item.topic.toLowerCase() !== "loops" || item.previousScore !== 35 || item.resultingScore !== null || item.scoreChange !== null) {
      throw new Error("Intervention record contents or pending status mismatch");
    }
    console.log("✓ Teacher 1 sees Alice's intervention with pending resulting score");

    // TEST 6: Teacher 2 isolation check (cannot see Alice's intervention)
    console.log("\n[TEST 6] Teacher 2 (unrelated) attempts to see Alice's intervention...");
    const resT2 = await fetch(`${API_BASE}/ai/interventions`, {
      headers: { Authorization: `Bearer ${teacher2Token}` },
    });
    const dataT2 = await resT2.json();
    console.log("Teacher 2 interventions count:", dataT2.data.interventions.length);
    if (dataT2.data.interventions.length !== 0) {
      throw new Error("Security leak: Teacher 2 saw Alice's intervention!");
    }

    const resT2Tamper = await fetch(`${API_BASE}/ai/interventions?studentId=${studentId.toString()}`, {
      headers: { Authorization: `Bearer ${teacher2Token}` },
    });
    const dataT2Tamper = await resT2Tamper.json();
    if (dataT2Tamper.data.interventions.length !== 0) {
      throw new Error("Security leak: Teacher 2 bypassed scoping with studentId param!");
    }
    console.log("✓ Teacher 2 isolation verified (0 interventions returned)");

    // TEST 7: Deduplication check within 24 hours
    console.log("\n[TEST 7] Deduplication check within 24 hours...");
    const duplicateDoc = await recordIntervention({
      studentId: studentId.toString(),
      classId: classId.toString(),
      type: "WEAK_TOPIC",
      topic: "Loops",
      language: "python",
      reason: "Low quiz score (35%) in loop boundaries",
      recommendation: "Practice while loops and off-by-one boundary checks",
      previousScore: 35,
      source: "QUIZ",
    });
    if (duplicateDoc._id.toString() !== interventionDoc._id.toString()) {
      throw new Error("Deduplication failed: created a duplicate record instead of returning existing one");
    }
    console.log("✓ Deduplication verified: returned existing intervention", duplicateDoc._id);

    // TEST 8: Student performs recommended practice, mastery increases
    console.log("\n[TEST 8] Student performs practice in Loops, updating mastery to 72%...");
    await db.collection("progresses").insertOne({
      studentId,
      topic: "Loops",
      language: "python",
      masteryScore: 72,
      lastPracticedAt: new Date(Date.now() + 10000), // subsequent practice
      solvedProblems: 5,
    });

    const resT1Updated = await fetch(`${API_BASE}/ai/interventions`, {
      headers: { Authorization: `Bearer ${teacher1Token}` },
    });
    const dataT1Updated = await resT1Updated.json();
    const updatedItem = dataT1Updated.data.interventions[0];
    console.log("Updated item from API:", {
      topic: updatedItem.topic,
      previousScore: updatedItem.previousScore,
      resultingScore: updatedItem.resultingScore,
      scoreChange: updatedItem.scoreChange,
      status: updatedItem.status,
    });

    if (updatedItem.resultingScore !== 72 || updatedItem.scoreChange !== 37) {
      throw new Error(`Expected resultingScore: 72, scoreChange: 37; got resultingScore: ${updatedItem.resultingScore}, scoreChange: ${updatedItem.scoreChange}`);
    }
    console.log("✓ Resulting score and improvement (+37%) dynamically and accurately computed from actual student practice!");

    console.log("\n=== ALL LIVE API VERIFICATION TESTS PASSED SUCCESSFULLY! ===");
  } finally {
    // Cleanup
    console.log("\nCleaning up live test entities...");
    await db.collection("users").deleteMany({ _id: { $in: [teacher1Id, teacher2Id, studentId] } });
    await db.collection("classes").deleteOne({ _id: classId });
    await db.collection("ai_interventions").deleteMany({ studentId });
    await db.collection("progresses").deleteMany({ studentId });
    await mongoose.disconnect();
    console.log("Cleanup complete and disconnected from DB.");
  }
}

runLiveVerification().catch((err) => {
  console.error("LIVE VERIFICATION FAILED:", err);
  process.exit(1);
});
