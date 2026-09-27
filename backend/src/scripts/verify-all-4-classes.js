const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000/api';
const JWT_SECRET = process.env.JWT_SECRET;
const teacherId = '6ab6b782c6c2542b8ecf191b';
const token = jwt.sign(
  { userId: teacherId, role: 'TEACHER', email: 'ji@mit.edu' },
  JWT_SECRET,
  { expiresIn: '1d' }
);
const headers = { Authorization: `Bearer ${token}` };

async function verify() {
  console.log('========================================================================');
  console.log('VERIFYING WEEKLY AI CLASSROOM REPORTS ACROSS 4 COHORTS AS TEACHER UDAY');
  console.log('========================================================================');

  // Step 1: Fetch teacher's classes via API
  console.log('\n[1/6] Fetching classes from GET /api/classes...');
  const classesRes = await axios.get(`${BASE_URL}/classes`, { headers });
  const classes = classesRes.data.data;
  console.log(`Retrieved ${classes.length} classes for teacher uday:`);
  classes.forEach((c, idx) => {
    console.log(`  ${idx + 1}. "${c.name}" | ID: ${c._id} | Students: ${(c.students || []).length} | Assignments: ${c.assignmentsCount}`);
  });

  const testClasses = [
    { label: 'Class A (Working)', id: '6ab6bae8ec5cdaa4a8cf4862', expectedName: 'DSA', hasActivity: true },
    { label: 'Class B (Was Broken 1)', id: '6ab7fb35ab3e73a6ee61ef04', expectedName: 'c++', hasActivity: true },
    { label: 'Class C (Was Broken 2)', id: '6ab6e7385d6f352dbd38b7d3', expectedName: 'CS101-1790371637621', hasActivity: true },
    { label: 'Class D (Genuinely Empty)', id: '6aafce6c85ad7eaedd771dd6', expectedName: 'Advanced Systems Lab', hasActivity: false },
  ];

  // Step 2: Generate reports for the active date range (Sep 20, 2026 - Sep 27, 2026)
  console.log('\n[2/6] Generating reports for active date range (2026-09-20 to 2026-09-27)...');
  const activeStart = '2026-09-20T00:00:00.000Z';
  const activeEnd = '2026-09-27T23:59:59.999Z';

  for (const tc of testClasses) {
    console.log(`\n--- Testing ${tc.label}: "${tc.expectedName}" (${tc.id}) ---`);
    const genRes = await axios.post(
      `${BASE_URL}/reports/weekly/${tc.id}/generate`,
      { startDate: activeStart, endDate: activeEnd },
      { headers }
    );

    const report = genRes.data.data;
    console.log(`Status: 200 OK | Report ID: ${report._id}`);
    console.log(`  - Class Name: "${report.className}"`);
    console.log(`  - Total Enrolled: ${report.statistics.totalStudents}`);
    console.log(`  - Active Students: ${report.statistics.activeStudents}`);
    console.log(`  - Total Submissions: ${report.statistics.totalSubmissions}`);
    console.log(`  - Cohort Average Score: ${report.statistics.averageScore}%`);
    console.log(`  - Strong Concepts: ${JSON.stringify(report.strongConcepts)}`);
    console.log(`  - Vulnerable Concepts: ${JSON.stringify(report.vulnerableConcepts)}`);
    console.log(`  - Flagged Students Count: ${(report.studentsNeedingIntervention || []).length}`);
    console.log(`  - Executive AI Summary: ${report.summary}`);
    console.log(`  - Recommendations Count: ${(report.recommendations || []).length}`);
    console.log(`  - Diagnostics:`, report.diagnostics);

    if (tc.hasActivity) {
      if (report.statistics.totalSubmissions === 0) {
        throw new Error(`FAILURE: Expected submissions > 0 for ${tc.expectedName}, but got 0!`);
      }
      if (report.summary.includes('No student activity was recorded')) {
        throw new Error(`FAILURE: ${tc.expectedName} has submissions but summary says no activity!`);
      }
      console.log(`  ✅ PASSED: Real student activity and report synthesized properly!`);
    } else {
      if (report.statistics.totalSubmissions !== 0) {
        throw new Error(`FAILURE: Expected 0 submissions for empty class ${tc.expectedName}, but got ${report.statistics.totalSubmissions}!`);
      }
      console.log(`  ✅ PASSED: Genuine empty state handled properly ("No student activity was recorded")!`);
    }
  }

  // Step 3: Verify GET /api/reports/weekly/:classId returns the generated report
  console.log('\n[3/6] Verifying GET /api/reports/weekly/:classId for each class...');
  for (const tc of testClasses) {
    const listRes = await axios.get(`${BASE_URL}/reports/weekly/${tc.id}`, { headers });
    const reports = listRes.data.data;
    console.log(`Class "${tc.expectedName}" has ${reports.length} report(s) in history. Latest ID: ${reports[0]?._id}`);
    if (reports.length === 0) {
      throw new Error(`FAILURE: No reports returned by GET /api/reports/weekly/${tc.id}!`);
    }
  }

  // Step 4: Test Date Range Change (Period with No Submissions)
  console.log('\n[4/6] Testing Date Range with Zero Activity (2026-07-01 to 2026-07-07)...');
  const pastStart = '2026-07-01T00:00:00.000Z';
  const pastEnd = '2026-07-07T23:59:59.999Z';
  const pastRes = await axios.post(
    `${BASE_URL}/reports/weekly/${testClasses[0].id}/generate`,
    { startDate: pastStart, endDate: pastEnd },
    { headers }
  );
  const pastReport = pastRes.data.data;
  console.log(`DSA in July 2026 -> Submissions: ${pastReport.statistics.totalSubmissions}, Active: ${pastReport.statistics.activeStudents}`);
  console.log(`Summary: "${pastReport.summary}"`);
  if (pastReport.statistics.totalSubmissions !== 0) {
    throw new Error('FAILURE: Expected 0 submissions in July 2026 for DSA!');
  }
  console.log(`  ✅ PASSED: Changing date range accurately produces empty report for inactive periods!`);

  // Step 5: Test Date String Normalization ("2026-09-20" through "2026-09-27")
  console.log('\n[5/6] Testing Date Strings without time ("2026-09-20" and "2026-09-27")...');
  const strRes = await axios.post(
    `${BASE_URL}/reports/weekly/${testClasses[1].id}/generate`,
    { startDate: '2026-09-20', endDate: '2026-09-27' },
    { headers }
  );
  const strReport = strRes.data.data;
  console.log(`c++ with date strings -> Submissions: ${strReport.statistics.totalSubmissions}, Active: ${strReport.statistics.activeStudents}`);
  if (strReport.statistics.totalSubmissions !== 5) {
    throw new Error(`FAILURE: Expected 5 submissions for c++ with date strings, got ${strReport.statistics.totalSubmissions}!`);
  }
  console.log(`  ✅ PASSED: Date strings correctly expanded to end-of-day UTC, capturing all 5 submissions!`);

  // Step 6: Verify Authorization Protection
  console.log('\n[6/6] Verifying Authorization Protection for Unauthorized Teacher...');
  const otherToken = jwt.sign(
    { userId: '6a82ece07d989862b0e50d29', role: 'TEACHER', email: 'teacher@test.com' },
    JWT_SECRET,
    { expiresIn: '1d' }
  );
  try {
    await axios.post(
      `${BASE_URL}/reports/weekly/${testClasses[0].id}/generate`,
      { startDate: activeStart, endDate: activeEnd },
      { headers: { Authorization: `Bearer ${otherToken}` } }
    );
    throw new Error('FAILURE: Unauthorized teacher was allowed to generate report!');
  } catch (err) {
    if (err.response?.status === 403) {
      console.log(`  ✅ PASSED: Unauthorized teacher correctly blocked with 403 Forbidden!`);
    } else {
      throw err;
    }
  }

  console.log('\n========================================================================');
  console.log('🎉 ALL 4 COHORTS AND VERIFICATION CHECKS COMPLETED SUCCESSFULLY!');
  console.log('========================================================================\n');
}

verify().catch((err) => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err.response?.data || err.message);
  process.exit(1);
});
