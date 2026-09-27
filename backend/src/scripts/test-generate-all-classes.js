const mongoose = require('mongoose');
require('dotenv').config();
const Class = require('../modules/classes/class.model');
const Assignment = require('../modules/assignments/assignment.model');
const Submission = require('../modules/submissions/submission.model');
const { generateWeeklyReportData } = require('../modules/reports/reports.service');

async function testAll() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME });

  const testClasses = [
    { name: 'DSA', classId: '6ab6bae8ec5cdaa4a8cf4862', teacherId: '6ab6b782c6c2542b8ecf191b' },
    { name: 'c++', classId: '6ab7fb35ab3e73a6ee61ef04', teacherId: '6ab6b782c6c2542b8ecf191b' },
    { name: 'LoadTest High-Concurrency Algorithms', classId: '6ab7d6791633023ad8fc8306', teacherId: '6ab7d6781633023ad8fc82fb' },
    { name: 'Hackathon Demo Lab 6086', classId: '6ab7ef600509333d80ff9579', teacherId: '6ab7d6781633023ad8fc82fb' },
    { name: 'CS101-1790371637621', classId: '6ab6e7385d6f352dbd38b7d3', teacherId: '6ab6e7365d6f352dbd38b7d0' },
    { name: 'Advanced Programming', classId: '6a83001d82d75fb61ef4b25e', teacherId: '6a82ece07d989862b0e50d29' },
    { name: 'Intro to CS', classId: '6aacdfc787bf3fedabbc71c8', teacherId: '6aacdfc487bf3fedabbc71c6' },
  ];

  // Test 1: Last 7 days (default in frontend)
  const now = new Date();
  const last7DaysStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const last7DaysEnd = now.toISOString();

  console.log(`\n================ TEST 1: Default Last 7 Days (${last7DaysStart} to ${last7DaysEnd}) ================`);
  for (const tc of testClasses) {
    try {
      const rep = await generateWeeklyReportData({
        classId: tc.classId,
        teacherId: tc.teacherId,
        userRole: 'TEACHER',
        startDate: last7DaysStart,
        endDate: last7DaysEnd,
      });
      console.log(`Class "${tc.name}" -> Submissions: ${rep.statistics.totalSubmissions}, Active: ${rep.statistics.activeStudents}, Avg: ${rep.statistics.averageScore}%, Summary: ${rep.summary.substring(0, 70)}...`);
    } catch (err) {
      console.error(`Class "${tc.name}" FAILED:`, err.message);
    }
  }

  // Test 2: Specific historical date range (e.g. August 2026 for Advanced Programming)
  console.log(`\n================ TEST 2: Historical August 2026 (for Advanced Programming) ================`);
  try {
    const rep = await generateWeeklyReportData({
      classId: '6a83001d82d75fb61ef4b25e',
      teacherId: '6a82ece07d989862b0e50d29',
      userRole: 'TEACHER',
      startDate: '2026-08-15T00:00:00.000Z',
      endDate: '2026-08-25T23:59:59.999Z',
    });
    console.log(`Class "Advanced Programming" -> Submissions: ${rep.statistics.totalSubmissions}, Active: ${rep.statistics.activeStudents}, Avg: ${rep.statistics.averageScore}%, Summary: ${rep.summary.substring(0, 70)}...`);
  } catch (err) {
    console.error(`Advanced Programming FAILED:`, err.message);
  }

  // Test 3: What if startDate / endDate are date strings like "2026-09-20" and "2026-09-27"?
  console.log(`\n================ TEST 3: Date strings "2026-09-20" to "2026-09-27" ================`);
  for (const tc of [testClasses[0], testClasses[1]]) {
    try {
      const rep = await generateWeeklyReportData({
        classId: tc.classId,
        teacherId: tc.teacherId,
        userRole: 'TEACHER',
        startDate: '2026-09-20',
        endDate: '2026-09-27',
      });
      console.log(`Class "${tc.name}" -> Submissions: ${rep.statistics.totalSubmissions}, Active: ${rep.statistics.activeStudents}, Avg: ${rep.statistics.averageScore}%, Summary: ${rep.summary.substring(0, 70)}...`);
    } catch (err) {
      console.error(`Class "${tc.name}" FAILED:`, err.message);
    }
  }

  await mongoose.disconnect();
}
testAll().catch(console.error);
