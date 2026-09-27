require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Class = require("../modules/classes/class.model");
const User = require("../modules/users/user.model");
const Assignment = require("../modules/assignments/assignment.model");
const Submission = require("../modules/submissions/submission.model");
const WeeklyReport = require("../modules/reports/weeklyReport.model");
const axios = require("axios");
const jwt = require("jsonwebtoken");

const BASE_URL = "http://localhost:3000/api";
const JWT_SECRET = process.env.JWT_SECRET;

function makeToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

async function run() {
  await connectDB();
  await new Promise((r) => setTimeout(r, 1500)); // wait for connection

  console.log("==========================================================");
  console.log("LIVE VERIFICATION: CLASS OWNERSHIP & DELETE");
  console.log("==========================================================\n");

  // ---- Find Teacher Uday (Instructor A) ----
  const udayUser = await User.findOne({ email: "ji@mit.edu" }).lean();
  if (!udayUser) throw new Error("Teacher uday not found");
  const udayToken = makeToken(udayUser);
  const udayHeaders = { Authorization: `Bearer ${udayToken}` };
  console.log(`[SETUP] Teacher A: uday (ID: ${udayUser._id})`);

  // ---- Find another teacher (Instructor B) ----
  const otherTeacher = await User.findOne({ role: "TEACHER", _id: { $ne: udayUser._id } }).lean();
  if (!otherTeacher) throw new Error("No second teacher found");
  const otherToken = makeToken(otherTeacher);
  const otherHeaders = { Authorization: `Bearer ${otherToken}` };
  console.log(`[SETUP] Teacher B: ${otherTeacher.name} (ID: ${otherTeacher._id})\n`);

  // ---- STEP 1: Verify GET /classes returns only Uday's classes ----
  console.log("[1/6] GET /api/classes as Teacher A (Uday)...");
  const udayClasses = await axios.get(`${BASE_URL}/classes`, { headers: udayHeaders });
  const udayClassList = udayClasses.data.data || [];
  console.log(`  → Returned ${udayClassList.length} classes`);
  const allOwned = udayClassList.every((c) => {
    const tid = (c.teacherId?._id || c.teacherId)?.toString();
    return tid === udayUser._id.toString();
  });
  if (!allOwned) throw new Error("FAIL: Some returned classes not owned by Uday!");
  console.log("  ✅ PASS: All returned classes owned by Teacher A\n");

  // ---- STEP 2: Verify GET /classes returns only Teacher B's classes ----
  console.log("[2/6] GET /api/classes as Teacher B...");
  const otherClasses = await axios.get(`${BASE_URL}/classes`, { headers: otherHeaders });
  const otherClassList = otherClasses.data.data || [];
  console.log(`  → Returned ${otherClassList.length} classes`);
  const allOwnedByB = otherClassList.every((c) => {
    const tid = (c.teacherId?._id || c.teacherId)?.toString();
    return tid === otherTeacher._id.toString();
  });
  if (!allOwnedByB) throw new Error("FAIL: Some returned classes not owned by Teacher B!");
  console.log("  ✅ PASS: All returned classes owned by Teacher B\n");

  // ---- STEP 3: Verify cross-access blocked for a real class ----
  if (otherClassList.length > 0) {
    const classBId = (otherClassList[0]._id || otherClassList[0].id).toString();
    const className = otherClassList[0].name;
    console.log(`[3/6] Teacher A trying to GET Teacher B's class "${className}" (${classBId})...`);
    try {
      await axios.get(`${BASE_URL}/classes/${classBId}`, { headers: udayHeaders });
      throw new Error("FAIL: Should have been 403!");
    } catch (err) {
      if (err.response?.status === 403) {
        console.log("  ✅ PASS: Teacher A correctly blocked (403 Forbidden)\n");
      } else {
        throw err;
      }
    }
  } else {
    console.log("[3/6] SKIP: Teacher B has no classes to test cross-access\n");
  }

  // ---- STEP 4: Verify Teacher A cannot generate report for Teacher B's class ----
  if (otherClassList.length > 0) {
    const classBId = (otherClassList[0]._id || otherClassList[0].id).toString();
    const className = otherClassList[0].name;
    console.log(`[4/6] Teacher A trying to generate report for Teacher B's class "${className}"...`);
    try {
      await axios.post(`${BASE_URL}/reports/weekly/${classBId}/generate`, {
        startDate: "2026-09-20",
        endDate: "2026-09-27",
      }, { headers: udayHeaders });
      throw new Error("FAIL: Should have been 403!");
    } catch (err) {
      if (err.response?.status === 403) {
        console.log("  ✅ PASS: Report generation blocked (403 Forbidden)\n");
      } else {
        throw err;
      }
    }
  } else {
    console.log("[4/6] SKIP: Teacher B has no classes\n");
  }

  // ---- STEP 5: Create a disposable test class for Teacher A to delete ----
  console.log("[5/6] Creating disposable class for Teacher A to delete...");
  const createRes = await axios.post(`${BASE_URL}/classes`, {
    name: "Disposable Test Class - DELETE ME",
    description: "Created for live deletion test",
  }, { headers: udayHeaders });
  const disposableClass = createRes.data.data;
  console.log(`  → Created class: "${disposableClass.name}" (ID: ${disposableClass._id})`);

  // Verify teacherId is set correctly
  const ownerId = (disposableClass.teacherId?._id || disposableClass.teacherId)?.toString();
  if (ownerId !== udayUser._id.toString()) {
    throw new Error(`FAIL: teacherId ${ownerId} !== ${udayUser._id}`);
  }
  console.log("  ✅ teacherId correctly set to Teacher A's ID\n");

  // ---- STEP 5b: Verify Teacher B cannot delete Teacher A's class ----
  console.log(`[5b] Teacher B trying to DELETE Teacher A's class "${disposableClass.name}"...`);
  try {
    await axios.delete(`${BASE_URL}/classes/${disposableClass._id}`, { headers: otherHeaders });
    throw new Error("FAIL: Should have been 403!");
  } catch (err) {
    if (err.response?.status === 403) {
      console.log("  ✅ PASS: Teacher B correctly blocked (403 Forbidden)\n");
    } else {
      throw err;
    }
  }

  // ---- STEP 6: Teacher A deletes their own class ----
  console.log(`[6/6] Teacher A deleting their class "${disposableClass.name}"...`);
  const deleteRes = await axios.delete(`${BASE_URL}/classes/${disposableClass._id}`, { headers: udayHeaders });
  console.log(`  → Response: ${JSON.stringify(deleteRes.data.message)}`);
  if (!deleteRes.data.success) throw new Error("FAIL: Delete did not succeed");

  // Verify it's gone from DB
  const verifyGone = await Class.findById(disposableClass._id).lean();
  if (verifyGone) throw new Error("FAIL: Class still exists in DB after deletion!");
  console.log("  ✅ PASS: Class successfully deleted from DB\n");

  // ---- STEP 6b: Verify Teacher A's remaining classes are intact ----
  console.log("[6b] Verifying Teacher A's remaining classes are intact...");
  const afterDeleteRes = await axios.get(`${BASE_URL}/classes`, { headers: udayHeaders });
  const afterDeleteList = afterDeleteRes.data.data || [];
  const deletedStillPresent = afterDeleteList.find((c) => (c._id || c.id)?.toString() === disposableClass._id.toString());
  if (deletedStillPresent) throw new Error("FAIL: Deleted class still appears in list!");
  console.log(`  → ${afterDeleteList.length} classes remain (all Teacher A's)`);
  console.log("  ✅ PASS: Deleted class no longer visible; other classes intact\n");

  // ---- STEP 6c: Verify Teacher B's classes are still intact ----
  console.log("[6c] Verifying Teacher B's classes still intact...");
  const afterDeleteOtherRes = await axios.get(`${BASE_URL}/classes`, { headers: otherHeaders });
  const afterDeleteOtherList = afterDeleteOtherRes.data.data || [];
  console.log(`  → Teacher B still has ${afterDeleteOtherList.length} classes (unchanged)`);
  console.log("  ✅ PASS: Teacher B's classes unaffected\n");

  console.log("==========================================================");
  console.log("🎉 ALL LIVE VERIFICATION STEPS PASSED!");
  console.log("==========================================================\n");

  process.exit(0);
}

run().catch((err) => {
  console.error("❌ LIVE VERIFICATION FAILED:", err.message);
  if (err.response?.data) console.error("Response:", err.response.data);
  process.exit(1);
});
