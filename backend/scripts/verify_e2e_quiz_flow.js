const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const { submitQuiz } = require("../src/modules/quizzes/quiz.service");
const Quiz = require("../src/modules/quizzes/quiz.model");
const Progress = require("../src/modules/progress/progress.model");
const User = require("../src/modules/users/user.model");
const Class = require("../src/modules/classes/class.model");
const AIIntervention = require("../src/modules/ai/aiIntervention.model");

const API_BASE = "http://localhost:3000/api";

async function runE2EQuizFlow() {
  console.log("=== END-TO-END VERIFICATION: QUIZ DEFICIT -> INTERVENTION -> PRACTICE -> MASTERY IMPROVEMENT ===");

  await mongoose.connect(process.env.MONGODB_URI, { dbName: "ai-lab" });
  console.log("Connected to MongoDB ai-lab.");

  const uniqueSuffix = Date.now();
  const teacherEmail = `e2e_teacher_${uniqueSuffix}@demo.edu`;
  const studentEmail = `e2e_student_${uniqueSuffix}@demo.edu`;

  // 1. Setup Demo Instructor, Student, and Class
  const teacher = await User.create({
    name: "Dr. E2E Instructor",
    email: teacherEmail,
    passwordHash: "dummyHash",
    role: "TEACHER",
    approvalStatus: "APPROVED",
  });

  const student = await User.create({
    name: "E2E Student Bob",
    email: studentEmail,
    passwordHash: "dummyHash",
    role: "STUDENT",
    approvalStatus: "APPROVED",
  });

  const classroom = await Class.create({
    name: `E2E Algorithms ${uniqueSuffix}`,
    teacherId: teacher._id,
    students: [student._id],
    languages: ["python"],
  });

  const teacherToken = jwt.sign(
    { userId: teacher._id.toString(), role: "TEACHER" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  console.log("Created test teacher:", teacher.email, "and student:", student.email);

  try {
    // 2. Create a Quiz on 'recursion'
    const quiz = await Quiz.create({
      title: "Recursion Diagnostics Quiz",
      topic: "recursion",
      topics: ["recursion"],
      language: "python",
      difficulty: "BEGINNER",
      questions: [
        {
          question: "What is the base case in a recursive function?",
          options: ["A) The condition that terminates recursion", "B) The loop condition", "C) The error handler", "D) None"],
          correctAnswer: "A",
          explanation: "Base case stops the recursive calls.",
          topic: "recursion",
        },
        {
          question: "What happens if a recursive function has no base case?",
          options: ["A) Returns 0", "B) Stack overflow / recursion error", "C) Compiles faster", "D) Memory is freed"],
          correctAnswer: "B",
          explanation: "Infinite recursion exhausts call stack.",
          topic: "recursion",
        },
      ],
    });

    console.log("Created quiz:", quiz.title, "id:", quiz._id);

    // 3. Student submits quiz with wrong answers (0% score -> deficit)
    console.log("\n[STEP 1] Student Bob submits quiz with poor score (deficit)...");
    const attempt = await submitQuiz({
      quizId: quiz._id.toString(),
      studentId: student._id.toString(),
      answers: [
        { selectedAnswer: "C" }, // Wrong
        { selectedAnswer: "A" }, // Wrong
      ],
    });

    console.log("Quiz submitted. Score:", attempt.score, "%");
    if (attempt.score !== 0) throw new Error("Expected 0% score");

    // 4. Verify Intervention was automatically persisted in database
    console.log("\n[STEP 2] Verifying AIIntervention persisted by quiz service...");
    const intervention = await AIIntervention.findOne({
      studentId: student._id,
      topic: "recursion",
      source: "QUIZ",
    });

    if (!intervention) {
      throw new Error("AIIntervention was not created automatically upon low quiz score!");
    }
    console.log("✓ AIIntervention successfully recorded in database:", {
      id: intervention._id,
      topic: intervention.topic,
      reason: intervention.reason,
      recommendation: intervention.recommendation,
      previousScore: intervention.previousScore,
      status: intervention.status,
    });

    // 5. Instructor opens dashboard and calls GET /api/ai/interventions
    console.log("\n[STEP 3] Instructor opens dashboard and queries intervention endpoint...");
    const resDashboard = await fetch(`${API_BASE}/ai/interventions`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    const dashboardData = await resDashboard.json();

    console.log("Dashboard API response status:", resDashboard.status);
    console.log("Dashboard interventions count:", dashboardData.data.interventions.length);

    if (dashboardData.data.interventions.length !== 1) {
      throw new Error(`Expected 1 intervention, received: ${dashboardData.data.interventions.length}`);
    }

    const fetchedItem = dashboardData.data.interventions[0];
    console.log("Fetched intervention:", {
      studentName: fetchedItem.studentName,
      topic: fetchedItem.topic,
      previousScore: fetchedItem.previousScore,
      resultingScore: fetchedItem.resultingScore,
      scoreChange: fetchedItem.scoreChange,
      status: fetchedItem.status,
    });

    if (fetchedItem.resultingScore !== null || fetchedItem.scoreChange !== null) {
      throw new Error("Resulting score should be null (Pending) before any subsequent practice!");
    }
    console.log("✓ Instructor Dashboard shows real intervention with Pending practice state");

    // 6. Student later performs practice activity, updating mastery in Progress
    console.log("\n[STEP 4] Student Bob completes recommended practice on recursion...");
    const practiceDate = new Date(Date.now() + 5000); // 5 seconds after intervention creation
    await Progress.findOneAndUpdate(
      { studentId: student._id, topic: "recursion" },
      {
        studentId: student._id,
        topic: "recursion",
        language: "python",
        masteryScore: 85,
        lastPracticedAt: practiceDate,
        $inc: { solvedProblems: 4 },
      },
      { upsert: true, new: true }
    );
    console.log("Student mastery updated to 85% at", practiceDate.toISOString());

    // 7. Instructor refreshes dashboard / calls API again
    console.log("\n[STEP 5] Instructor refreshes dashboard API...");
    const resRefreshed = await fetch(`${API_BASE}/ai/interventions`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    const refreshedData = await resRefreshed.json();
    const updatedIntervention = refreshedData.data.interventions[0];

    console.log("Refreshed intervention data:", {
      studentName: updatedIntervention.studentName,
      topic: updatedIntervention.topic,
      previousScore: updatedIntervention.previousScore,
      resultingScore: updatedIntervention.resultingScore,
      scoreChange: updatedIntervention.scoreChange,
      status: updatedIntervention.status,
    });

    if (updatedIntervention.resultingScore !== 85) {
      throw new Error(`Expected resultingScore: 85, got ${updatedIntervention.resultingScore}`);
    }
    const expectedChange = updatedIntervention.resultingScore - updatedIntervention.previousScore;
    if (updatedIntervention.scoreChange !== expectedChange) {
      throw new Error(`Expected scoreChange: ${expectedChange}, got ${updatedIntervention.scoreChange}`);
    }
    if (updatedIntervention.status !== "IMPROVED") {
      throw new Error(`Expected status: IMPROVED, got ${updatedIntervention.status}`);
    }

    console.log("\n✓ FULL END-TO-END FLOW VERIFIED SUCCESSFULLY!");
    console.log("Weakness Detected -> Intervention Saved -> Instructor Dashboard Loaded -> Practice Done -> Mastery Calculated (+85% Improvement)");
  } finally {
    console.log("\nCleaning up test entities...");
    await User.deleteMany({ _id: { $in: [teacher._id, student._id] } });
    await Class.deleteOne({ _id: classroom._id });
    await Quiz.deleteOne({ topic: "recursion", title: "Recursion Diagnostics Quiz" });
    await AIIntervention.deleteMany({ studentId: student._id });
    await Progress.deleteMany({ studentId: student._id });
    await mongoose.disconnect();
    console.log("Cleanup finished.");
  }
}

runE2EQuizFlow().catch((err) => {
  console.error("E2E FLOW FAILED:", err);
  process.exit(1);
});
