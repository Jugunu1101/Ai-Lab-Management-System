const mongoose = require('mongoose');
const User = require('../../src/modules/users/user.model');
const College = require('../../src/modules/colleges/college.model');
const Class = require('../../src/modules/classes/class.model');
const Assignment = require('../../src/modules/assignments/assignment.model');
const Submission = require('../../src/modules/submissions/submission.model');
const Progress = require('../../src/modules/progress/progress.model');
const QuizAttempt = require('../../src/modules/quizzes/quizAttempt.model');
const WeeklyReport = require('../../src/modules/reports/weeklyReport.model');
const {
  generateWeeklyReportData,
  getWeeklyReportsByClass,
  formatWeeklyReport,
} = require('../../src/modules/reports/reports.service');

// Mock ai.service so tests run deterministically without external HTTP server
jest.mock('../../src/services/ai/ai.service', () => ({
  generateWeeklyReport: jest.fn().mockImplementation(async (metricsPayload) => {
    // Mimic the dynamic mock logic grounded in real provided data
    const strong = metricsPayload.strongTopics || [];
    const weak = metricsPayload.weakTopics || [];
    const atRisk = metricsPayload.atRiskStudents || [];
    const avg = metricsPayload.averageScore;
    const name = metricsPayload.className;

    if (metricsPayload.submissionCount === 0 && atRisk.length === 0 && weak.length === 0 && strong.length === 0) {
      return {
        summary: `No student activity was recorded for ${name} during this period.`,
        strongTopics: strong,
        weakTopics: weak,
        studentsNeedingAttention: [],
        recommendations: [
          'Encourage students to begin working on assigned laboratory exercises and quizzes.',
        ],
        model: 'gemini-1.5-flash',
        promptVersion: '1.0',
      };
    }

    const recs = weak.map((w) => `Conduct targeted review and provide hands-on practice problems focusing on ${w}.`);
    if (recs.length === 0) {
      recs.push('Introduce advanced optimization challenges and algorithmic problem sets to maintain engagement.');
    }

    return {
      summary: `Class ${name} recorded an average score of ${avg}%. Strong performance in ${strong.join(', ') || 'core concepts'} was observed, while ${weak.join(', ') || 'none'} requires targeted intervention.`,
      strongTopics: strong,
      weakTopics: weak,
      studentsNeedingAttention: atRisk.map((s) => ({
        name: s.name,
        reason: s.reason,
      })),
      recommendations: recs,
      model: 'gemini-1.5-flash',
      promptVersion: '1.0',
    };
  }),
}));

describe('Weekly AI Classroom Reports — Authoritative Pipeline Tests', () => {
  let college;
  let teacherA;
  let teacherB;
  let student1;
  let student2;
  let student3;
  let classA;
  let classB;
  let assignment1;
  let assignment2;

  beforeEach(async () => {
    college = await College.create({
      name: 'Engineering University',
      code: 'ENG',
      domains: ['eng.edu'],
      status: 'ACTIVE',
    });

    teacherA = await User.create({
      name: 'Professor Alpha',
      email: 'alpha@eng.edu',
      passwordHash: 'hash',
      role: 'TEACHER',
      collegeId: college._id,
      approvalStatus: 'APPROVED',
    });

    teacherB = await User.create({
      name: 'Professor Beta',
      email: 'beta@eng.edu',
      passwordHash: 'hash',
      role: 'TEACHER',
      collegeId: college._id,
      approvalStatus: 'APPROVED',
    });

    student1 = await User.create({
      name: 'Alice Cooper',
      email: 'alice@eng.edu',
      passwordHash: 'hash',
      role: 'STUDENT',
      collegeId: college._id,
      approvalStatus: 'APPROVED',
    });

    student2 = await User.create({
      name: 'Bob Martin',
      email: 'bob@eng.edu',
      passwordHash: 'hash',
      role: 'STUDENT',
      collegeId: college._id,
      approvalStatus: 'APPROVED',
    });

    student3 = await User.create({
      name: 'Charlie Brown',
      email: 'charlie@eng.edu',
      passwordHash: 'hash',
      role: 'STUDENT',
      collegeId: college._id,
      approvalStatus: 'APPROVED',
    });

    classA = await Class.create({
      name: 'DSA',
      code: 'DSA101',
      teacherId: teacherA._id,
      collegeId: college._id,
      students: [student1._id, student2._id, student3._id],
      languages: ['cpp', 'python'],
    });

    classB = await Class.create({
      name: 'Web Development',
      code: 'WEB201',
      teacherId: teacherB._id,
      collegeId: college._id,
      students: [student3._id],
      languages: ['javascript'],
    });

    assignment1 = await Assignment.create({
      title: 'Arrays & Vectors',
      description: 'Solve dynamic array problems',
      classId: classA._id,
      createdBy: teacherA._id,
      language: 'cpp',
      topics: ['Arrays'],
      difficulty: 'EASY',
      points: 100,
    });

    assignment2 = await Assignment.create({
      title: 'Recursion & Backtracking',
      description: 'Solve recursive tree problems',
      classId: classA._id,
      createdBy: teacherA._id,
      language: 'cpp',
      topics: ['Recursion'],
      difficulty: 'MEDIUM',
      points: 100,
    });
  });

  // TEST 1: No student activity
  test('TEST 1: No student activity during period returns clean empty state', async () => {
    const report = await generateWeeklyReportData({
      classId: classA._id,
      teacherId: teacherA._id,
      userRole: 'TEACHER',
      startDate: '2026-09-01T00:00:00.000Z',
      endDate: '2026-09-07T23:59:59.999Z',
    });

    expect(report.statistics.totalStudents).toBe(3);
    expect(report.statistics.activeStudents).toBe(0);
    expect(report.statistics.totalSubmissions).toBe(0);
    expect(report.statistics.averageScore).toBe(0);
    expect(report.strongConcepts).toHaveLength(0);
    expect(report.vulnerableConcepts).toHaveLength(0);
    expect(report.studentsNeedingIntervention).toHaveLength(0);
    expect(report.summary).toContain('No student activity was recorded');
  });

  // TEST 2: One student with one submission
  test('TEST 2: One student with one submission aggregates correctly', async () => {
    const periodStart = '2026-09-18T00:00:00.000Z';
    const periodEnd = '2026-09-25T23:59:59.999Z';

    await Submission.create({
      assignmentId: assignment1._id,
      userId: student1._id,
      code: 'int main() {}',
      language: 'cpp',
      status: 'PASSED',
      score: 85,
      attemptNumber: 1,
      createdAt: new Date('2026-09-20T10:00:00.000Z'),
    });

    const report = await generateWeeklyReportData({
      classId: classA._id,
      teacherId: teacherA._id,
      userRole: 'TEACHER',
      startDate: periodStart,
      endDate: periodEnd,
    });

    expect(report.statistics.totalStudents).toBe(3);
    expect(report.statistics.activeStudents).toBe(1);
    expect(report.statistics.totalSubmissions).toBe(1);
    expect(report.statistics.averageScore).toBe(85);
  });

  // TEST 3: Multiple students with different scores
  test('TEST 3: Multiple students with different scores calculate average and median correctly', async () => {
    const periodStart = '2026-09-18T00:00:00.000Z';
    const periodEnd = '2026-09-25T23:59:59.999Z';

    // Alice: 90 on assignment1
    await Submission.create({
      assignmentId: assignment1._id,
      userId: student1._id,
      code: 'code',
      language: 'cpp',
      status: 'PASSED',
      score: 90,
      attemptNumber: 1,
      createdAt: new Date('2026-09-20T10:00:00.000Z'),
    });

    // Bob: 60 on assignment1
    await Submission.create({
      assignmentId: assignment1._id,
      userId: student2._id,
      code: 'code',
      language: 'cpp',
      status: 'PASSED',
      score: 60,
      attemptNumber: 1,
      createdAt: new Date('2026-09-21T10:00:00.000Z'),
    });

    // Charlie: 30 on assignment1
    await Submission.create({
      assignmentId: assignment1._id,
      userId: student3._id,
      code: 'code',
      language: 'cpp',
      status: 'FAILED',
      score: 30,
      attemptNumber: 1,
      createdAt: new Date('2026-09-22T10:00:00.000Z'),
    });

    const report = await generateWeeklyReportData({
      classId: classA._id,
      teacherId: teacherA._id,
      userRole: 'TEACHER',
      startDate: periodStart,
      endDate: periodEnd,
    });

    expect(report.statistics.activeStudents).toBe(3);
    expect(report.statistics.totalSubmissions).toBe(3);
    // Average = (90 + 60 + 30) / 3 = 60
    expect(report.statistics.averageScore).toBe(60);
    // Median of [30, 60, 90] = 60
    expect(report.statistics.medianScore).toBe(60);
  });

  // TEST 4: Strong concepts calculated correctly (score >= 70)
  test('TEST 4: Strong concepts (>= 70%) calculated correctly from student topic mastery', async () => {
    await Progress.create({
      studentId: student1._id,
      language: 'cpp',
      topic: 'Arrays',
      masteryScore: 80,
      assignmentScore: 80,
      quizScore: 80,
    });

    await Progress.create({
      studentId: student2._id,
      language: 'cpp',
      topic: 'Arrays',
      masteryScore: 76,
      assignmentScore: 76,
      quizScore: 76,
    });

    const report = await generateWeeklyReportData({
      classId: classA._id,
      teacherId: teacherA._id,
      userRole: 'TEACHER',
    });

    const arraysConcept = report.strongConcepts.find((c) => c.topic === 'Arrays');
    expect(arraysConcept).toBeDefined();
    expect(arraysConcept.score).toBe(78);
    expect(report.strongTopics).toContain('Arrays');
  });

  // TEST 5: Topic score 49 -> vulnerable (strictly < 50)
  test('TEST 5: Topic score 49 is vulnerable (strictly < 50)', async () => {
    await Progress.create({
      studentId: student1._id,
      language: 'cpp',
      topic: 'Recursion',
      masteryScore: 49,
      assignmentScore: 49,
      quizScore: 49,
    });

    const report = await generateWeeklyReportData({
      classId: classA._id,
      teacherId: teacherA._id,
      userRole: 'TEACHER',
    });

    const vulner = report.vulnerableConcepts.find((c) => c.topic === 'Recursion');
    expect(vulner).toBeDefined();
    expect(vulner.score).toBe(49);
    expect(report.weakTopics).toContain('Recursion');
  });

  // TEST 6: Topic score 50 -> NOT vulnerable (strictly < 50)
  test('TEST 6: Topic score 50 is NOT vulnerable (must satisfy < 50 strictly)', async () => {
    await Progress.create({
      studentId: student1._id,
      language: 'cpp',
      topic: 'Pointers',
      masteryScore: 50,
      assignmentScore: 50,
      quizScore: 50,
    });

    const report = await generateWeeklyReportData({
      classId: classA._id,
      teacherId: teacherA._id,
      userRole: 'TEACHER',
    });

    const vulner = report.vulnerableConcepts.find((c) => c.topic === 'Pointers');
    expect(vulner).toBeUndefined();
    expect(report.weakTopics).not.toContain('Pointers');
  });

  // TEST 7: Student with low mastery -> intervention candidate
  test('TEST 7: Student with low mastery is flagged for direct intervention with exact reason', async () => {
    await Progress.create({
      studentId: student1._id,
      language: 'cpp',
      topic: 'Recursion',
      masteryScore: 38,
      assignmentScore: 38,
      quizScore: 38,
    });

    // Provide submission activity so cohort is active
    await Submission.create({
      assignmentId: assignment2._id,
      userId: student1._id,
      code: 'code',
      language: 'cpp',
      status: 'FAILED',
      score: 35,
      attemptNumber: 1,
      createdAt: new Date(),
    });

    const report = await generateWeeklyReportData({
      classId: classA._id,
      teacherId: teacherA._id,
      userRole: 'TEACHER',
    });

    const flagged = report.studentsNeedingIntervention.find(
      (s) => s.studentId.toString() === student1._id.toString()
    );
    expect(flagged).toBeDefined();
    expect(flagged.studentName).toBe('Alice Cooper');
    expect(flagged.reasons.some((r) => r.includes('Recursion mastery: 38%'))).toBe(true);
  });

  // TEST 8: Student with no submission -> correct reason
  test('TEST 8: Student with no submission in active cohort displays "No submissions during this period"', async () => {
    // Alice submits work
    await Submission.create({
      assignmentId: assignment1._id,
      userId: student1._id,
      code: 'code',
      language: 'cpp',
      status: 'PASSED',
      score: 85,
      attemptNumber: 1,
      createdAt: new Date(),
    });

    // Bob has low mastery and no submissions
    await Progress.create({
      studentId: student2._id,
      language: 'cpp',
      topic: 'Arrays',
      masteryScore: 40,
    });

    const report = await generateWeeklyReportData({
      classId: classA._id,
      teacherId: teacherA._id,
      userRole: 'TEACHER',
    });

    const flaggedBob = report.studentsNeedingIntervention.find(
      (s) => s.studentId.toString() === student2._id.toString()
    );
    expect(flaggedBob).toBeDefined();
    expect(flaggedBob.reasons).toContain('No submissions during this period');
  });

  // TEST 9: Student with submission -> must NOT say "No submissions"
  test('TEST 9: Student who submitted work must NEVER receive "No submissions" reason', async () => {
    await Submission.create({
      assignmentId: assignment1._id,
      userId: student1._id,
      code: 'code',
      language: 'cpp',
      status: 'FAILED',
      score: 35,
      attemptNumber: 1,
      createdAt: new Date(),
    });

    const report = await generateWeeklyReportData({
      classId: classA._id,
      teacherId: teacherA._id,
      userRole: 'TEACHER',
    });

    const flaggedAlice = report.studentsNeedingIntervention.find(
      (s) => s.studentId.toString() === student1._id.toString()
    );
    expect(flaggedAlice).toBeDefined();
    expect(flaggedAlice.reasons).toContain('Low assignment performance: 35%');
    expect(flaggedAlice.reasons.some((r) => r.includes('No submissions'))).toBe(false);
  });

  // TEST 10: Teacher A cannot see Teacher B's class
  test('TEST 10: Teacher A cannot generate or view reports for Teacher B class (403 FORBIDDEN)', async () => {
    await expect(
      generateWeeklyReportData({
        classId: classB._id, // owned by Teacher B
        teacherId: teacherA._id.toString(),
        userRole: 'TEACHER',
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });

    await expect(
      getWeeklyReportsByClass({
        classId: classB._id,
        teacherId: teacherA._id.toString(),
        userRole: 'TEACHER',
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });

  // TEST 11: Date range correctly filters activity
  test('TEST 11: Date range correctly filters activity, excluding outside submissions', async () => {
    const targetPeriodStart = '2026-09-18T00:00:00.000Z';
    const targetPeriodEnd = '2026-09-25T23:59:59.999Z';

    // Outside submission: Aug 15
    await Submission.create({
      assignmentId: assignment1._id,
      userId: student1._id,
      code: 'code',
      language: 'cpp',
      status: 'PASSED',
      score: 100,
      attemptNumber: 1,
      createdAt: new Date('2026-08-15T12:00:00.000Z'),
    });

    // Inside submission: Sep 20
    await Submission.create({
      assignmentId: assignment1._id,
      userId: student2._id,
      code: 'code',
      language: 'cpp',
      status: 'PASSED',
      score: 75,
      attemptNumber: 1,
      createdAt: new Date('2026-09-20T12:00:00.000Z'),
    });

    // Outside submission: Oct 10
    await Submission.create({
      assignmentId: assignment1._id,
      userId: student3._id,
      code: 'code',
      language: 'cpp',
      status: 'PASSED',
      score: 95,
      attemptNumber: 1,
      createdAt: new Date('2026-10-10T12:00:00.000Z'),
    });

    const report = await generateWeeklyReportData({
      classId: classA._id,
      teacherId: teacherA._id,
      userRole: 'TEACHER',
      startDate: targetPeriodStart,
      endDate: targetPeriodEnd,
    });

    // Only Bob's Sep 20 submission must be counted
    expect(report.statistics.totalSubmissions).toBe(1);
    expect(report.statistics.activeStudents).toBe(1);
    expect(report.statistics.averageScore).toBe(75);
  });

  // TEST 12: Generate with AI sends real aggregated data
  test('TEST 12: AI service is called with authentic aggregated metrics payload', async () => {
    const { generateWeeklyReport } = require('../../src/services/ai/ai.service');

    await Submission.create({
      assignmentId: assignment1._id,
      userId: student1._id,
      code: 'code',
      language: 'cpp',
      status: 'PASSED',
      score: 80,
      attemptNumber: 1,
      createdAt: new Date(),
    });

    await generateWeeklyReportData({
      classId: classA._id,
      teacherId: teacherA._id,
      userRole: 'TEACHER',
    });

    expect(generateWeeklyReport).toHaveBeenCalled();
    const passedPayload = generateWeeklyReport.mock.calls[generateWeeklyReport.mock.calls.length - 1][0];

    expect(passedPayload.className).toBe('DSA');
    expect(passedPayload.studentCount).toBe(3);
    expect(passedPayload.activeStudents).toBe(1);
    expect(passedPayload.submissionCount).toBe(1);
    expect(passedPayload.averageScore).toBe(80);
  });

  // TEST 13: Mock AI uses supplied real data
  test('TEST 13: Mock AI synthesis reflects actual weak concepts without hardcoded text', async () => {
    await Progress.create({
      studentId: student1._id,
      language: 'cpp',
      topic: 'Recursion',
      masteryScore: 43,
    });

    const report = await generateWeeklyReportData({
      classId: classA._id,
      teacherId: teacherA._id,
      userRole: 'TEACHER',
    });

    expect(report.summary).toContain('DSA');
    expect(report.vulnerableConcepts).toEqual(
      expect.arrayContaining([expect.objectContaining({ topic: 'Recursion', score: 43 })])
    );
    // Recommendations must address Recursion
    expect(report.recommendations.some((r) => r.toLowerCase().includes('recursion'))).toBe(true);
  });

  // TEST 14: AI response validation and persistence works
  test('TEST 14: AI response is validated and stored in WeeklyReport collection', async () => {
    const report = await generateWeeklyReportData({
      classId: classA._id,
      teacherId: teacherA._id,
      userRole: 'TEACHER',
    });

    const dbReport = await WeeklyReport.findById(report._id);
    expect(dbReport).toBeDefined();
    expect(dbReport.classId.toString()).toBe(classA._id.toString());
    expect(dbReport.className).toBe('DSA');
    expect(dbReport.statistics.totalStudents).toBe(3);
    expect(dbReport.summary).toBe(report.summary);
  });

  // TEST 15: PDF export data matches displayed report
  test('TEST 15: Formatted report object contains complete data contract for PDF export', async () => {
    const report = await generateWeeklyReportData({
      classId: classA._id,
      teacherId: teacherA._id,
      userRole: 'TEACHER',
    });

    const formatted = formatWeeklyReport(report);
    expect(formatted).toHaveProperty('className', 'DSA');
    expect(formatted).toHaveProperty('period');
    expect(formatted.period).toHaveProperty('start');
    expect(formatted.period).toHaveProperty('end');
    expect(formatted).toHaveProperty('statistics');
    expect(formatted).toHaveProperty('strongConcepts');
    expect(formatted).toHaveProperty('vulnerableConcepts');
    expect(formatted).toHaveProperty('studentsNeedingIntervention');
    expect(formatted).toHaveProperty('summary');
    expect(formatted).toHaveProperty('recommendations');
    expect(Array.isArray(formatted.recommendations)).toBe(true);
  });

  // TEST 16: Multiple students with different mastery scores aggregate correctly
  test('TEST 16: Multiple students with different mastery scores aggregate correctly to cohort average', async () => {
    // Reset Progress for classA students
    await Progress.deleteMany({ studentId: { $in: [student1._id, student2._id, student3._id] } });

    // Student 1 = 80%
    await Progress.create({
      studentId: student1._id,
      language: 'cpp',
      topic: 'Algorithms',
      masteryScore: 80,
    });

    // Student 2 = 40%
    await Progress.create({
      studentId: student2._id,
      language: 'cpp',
      topic: 'Algorithms',
      masteryScore: 40,
    });

    // Student 3 = 20%
    await Progress.create({
      studentId: student3._id,
      language: 'cpp',
      topic: 'Algorithms',
      masteryScore: 20,
    });

    const report = await generateWeeklyReportData({
      classId: classA._id,
      teacherId: teacherA._id,
      userRole: 'TEACHER',
      startDate: '2026-09-21T00:00:00.000Z',
      endDate: '2026-09-28T23:59:59.999Z',
    });

    // Expected: (80 + 40 + 20) / 3 = 46.666 -> Math.round -> 47
    expect(report.statistics.averageScore).toBe(47);
  });

  // TEST 17: All submissions passed but students have underlying mastery records below 100%
  test('TEST 17: Passing submissions do NOT override lower student topic mastery with 100%', async () => {
    await Progress.deleteMany({ studentId: { $in: [student1._id, student2._id, student3._id] } });

    await Progress.create({
      studentId: student1._id,
      language: 'cpp',
      topic: 'Conditionals',
      masteryScore: 35,
    });
    await Progress.create({
      studentId: student2._id,
      language: 'cpp',
      topic: 'Loops',
      masteryScore: 45,
    });

    // Submissions with 100% score
    await Submission.create({
      assignmentId: assignment1._id,
      userId: student1._id,
      code: 'int main() {}',
      language: 'cpp',
      status: 'PASSED',
      score: 100,
      attemptNumber: 1,
      createdAt: new Date('2026-09-24T12:00:00.000Z'),
    });
    await Submission.create({
      assignmentId: assignment1._id,
      userId: student2._id,
      code: 'int main() {}',
      language: 'cpp',
      status: 'PASSED',
      score: 100,
      attemptNumber: 1,
      createdAt: new Date('2026-09-24T13:00:00.000Z'),
    });

    const report = await generateWeeklyReportData({
      classId: classA._id,
      teacherId: teacherA._id,
      userRole: 'TEACHER',
      startDate: '2026-09-21T00:00:00.000Z',
      endDate: '2026-09-28T23:59:59.999Z',
    });

    // Expected: student 1 = 35%, student 2 = 45% -> Avg = (35 + 45) / 2 = 40% (NOT 100%)
    expect(report.statistics.averageScore).toBe(40);
    expect(report.statistics.averageScore).not.toBe(100);
  });
});

