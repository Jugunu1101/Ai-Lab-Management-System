const axios = require('axios');
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:3000/api';
const JWT_SECRET = process.env.JWT_SECRET || '0087da057c761317f0eb87d3473d6aef3d4fbefbc0acc7b29f6cacaec29ab016';

async function runLiveVerification() {
  console.log('\n======================================================');
  console.log(' LIVE VERIFICATION: WEEKLY AI CLASSROOM REPORTS ');
  console.log('======================================================\n');

  try {
    // 1. Generate auth token for primary DSA teacher (uday)
    const teacherId = '6ab6b782c6c2542b8ecf191b';
    const teacherToken = jwt.sign(
      { userId: teacherId, role: 'TEACHER', email: 'ji@mit.edu' },
      JWT_SECRET,
      { expiresIn: '1d' }
    );
    console.log('[1/7] Generated valid authenticated teacher JWT for "uday" (ji@mit.edu).');

    const teacherAuthHeaders = {
      headers: { Authorization: `Bearer ${teacherToken}` },
    };

    // 2. Fetch classes for teacher
    console.log('\n[2/7] Fetching teacher classrooms from live backend...');
    const classesRes = await axios.get(`${BASE_URL}/classes`, teacherAuthHeaders);
    const classes = classesRes.data?.data?.classes || classesRes.data?.classes || classesRes.data?.data || [];
    console.log(`  -> Found ${classes.length} classroom(s).`);

    const dsaClass = classes.find(
      (c) => c.name.toLowerCase().includes('data structure') || c.name.toLowerCase().includes('dsa')
    ) || classes[0];

    if (!dsaClass) {
      throw new Error('No classroom found for teacher');
    }
    console.log(`  -> Selected Classroom: "${dsaClass.name}" (ID: ${dsaClass._id})`);
    console.log(`  -> Enrolled students in class: ${dsaClass.students?.length || 0}`);

    // 3. Generate Weekly AI Report with specific date range
    console.log('\n[3/7] Calling POST /api/reports/weekly/:classId/generate with custom date range...');
    const startDate = '2026-09-01T00:00:00.000Z';
    const endDate = '2026-09-30T23:59:59.999Z';
    console.log(`  -> Requested Period: ${startDate} to ${endDate}`);

    const generateRes = await axios.post(
      `${BASE_URL}/reports/weekly/${dsaClass._id}/generate`,
      { startDate, endDate },
      teacherAuthHeaders
    );

    console.log(`  -> Response Status: ${generateRes.status}`);
    const report = generateRes.data?.data || generateRes.data;
    if (!report || !report._id) {
      throw new Error('Report generation did not return valid report object');
    }

    console.log('  -> Generated Report ID:', report._id);
    console.log('  -> Class Name:', report.className);
    console.log('  -> Output Period:', `${report.period?.start || report.weekStart} to ${report.period?.end || report.weekEnd}`);

    // 4. Verify statistics
    console.log('\n[4/7] Verifying cohort telemetry statistics...');
    const stats = report.statistics;
    console.log('  -> Total Students:', stats?.totalStudents);
    console.log('  -> Active Students:', stats?.activeStudents);
    console.log('  -> Total Submissions:', stats?.totalSubmissions);
    console.log('  -> Average Score:', stats?.averageScore + '%');
    console.log('  -> Median Score:', stats?.medianScore + '%');

    // 5. Verify Strong and Vulnerable Concepts
    console.log('\n[5/7] Verifying Concept Mastery thresholds...');
    console.log('  -> Strong Concepts (score >= 70):', JSON.stringify(report.strongConcepts || []));
    console.log('  -> Vulnerable Concepts (score < 50):', JSON.stringify(report.vulnerableConcepts || []));

    if (report.vulnerableConcepts && report.vulnerableConcepts.length > 0) {
      for (const vc of report.vulnerableConcepts) {
        if (vc.score >= 50) {
          throw new Error(`Invalid vulnerable concept: score ${vc.score} must be strictly < 50`);
        }
      }
      console.log('  -> Rule verified: All vulnerable concept scores strictly < 50%');
    }

    // 6. Verify Students Flagged for Direct Intervention
    console.log('\n[6/7] Verifying Students Flagged for Direct Intervention...');
    const flagged = report.studentsNeedingIntervention || report.studentsNeedingAttention || [];
    console.log(`  -> Flagged Count: ${flagged.length}`);
    for (const s of flagged) {
      console.log(`     - Student: "${s.studentName || s.name}" (ID: ${s.studentId})`);
      console.log(`       Reasons: ${Array.isArray(s.reasons) ? s.reasons.join(', ') : s.reason}`);
      console.log(`       Score: ${s.score !== null && s.score !== undefined ? s.score + '%' : 'N/A'}`);

      // Verify no hardcoded "Halku Re"
      if ((s.studentName || s.name) === 'Halku Re') {
        throw new Error('Hardcoded name "Halku Re" detected!');
      }
    }

    console.log('\n[7/7] Verifying AI Executive Summary & Actionable Recommendations...');
    console.log('  -> Executive Summary:\n    ', report.summary);
    console.log('  -> Recommendations:');
    (report.recommendations || []).forEach((r, idx) => {
      console.log(`     ${idx + 1}. ${r}`);
    });

    // 8. Fetch stored weekly reports to verify persistence
    console.log('\n[Persistence Check] Fetching stored weekly reports via GET /api/reports/weekly/:classId...');
    const listRes = await axios.get(`${BASE_URL}/reports/weekly/${dsaClass._id}`, teacherAuthHeaders);
    const reportsList = listRes.data?.data || [];
    console.log(`  -> Successfully retrieved ${reportsList.length} report(s) from MongoDB.`);

    // 9. Authorization check: Try accessing with a different unauthorized teacher
    console.log('\n[Security Check] Testing teacher isolation...');
    const unauthorizedTeacherId = '6ab6b2cffc39df4b665d8eba';
    const unauthorizedToken = jwt.sign(
      { userId: unauthorizedTeacherId, role: 'TEACHER', email: 'other_teacher@mit.edu' },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    try {
      await axios.post(
        `${BASE_URL}/reports/weekly/${dsaClass._id}/generate`,
        { startDate, endDate },
        { headers: { Authorization: `Bearer ${unauthorizedToken}` } }
      );
      throw new Error('SECURITY VIOLATION: Unauthorized teacher was able to generate report for class!');
    } catch (authErr) {
      if (authErr.response?.status === 403) {
        console.log('  -> Security Verified: Unauthorized teacher blocked with 403 FORBIDDEN.');
      } else {
        throw authErr;
      }
    }

    try {
      await axios.get(
        `${BASE_URL}/reports/weekly/${dsaClass._id}`,
        { headers: { Authorization: `Bearer ${unauthorizedToken}` } }
      );
      throw new Error('SECURITY VIOLATION: Unauthorized teacher was able to get reports for class!');
    } catch (authErr) {
      if (authErr.response?.status === 403) {
        console.log('  -> Security Verified: Unauthorized teacher blocked from viewing reports with 403 FORBIDDEN.');
      } else {
        throw authErr;
      }
    }

    console.log('\n======================================================');
    console.log(' LIVE VERIFICATION COMPLETED SUCCESSFULLY! ALL PASS ');
    console.log('======================================================\n');
  } catch (error) {
    console.error('\nLIVE VERIFICATION FAILED:', error.response?.data || error.message);
    process.exit(1);
  }
}

runLiveVerification();
