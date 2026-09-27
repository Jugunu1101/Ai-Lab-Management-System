const { generateWeeklyReportData, getWeeklyReportsByClass } = require('../../src/modules/reports/reports.service');
const User = require('../../src/modules/users/user.model');
const College = require('../../src/modules/colleges/college.model');
const Class = require('../../src/modules/classes/class.model');
const Assignment = require('../../src/modules/assignments/assignment.model');
const Submission = require('../../src/modules/submissions/submission.model');
const Progress = require('../../src/modules/progress/progress.model');

describe('Weekly AI Classroom Reports - Multi-Class Support & Boundary Verification', () => {
  let college;
  let teacher;
  let otherTeacher;
  let studentA;
  let studentB;
  let classA;
  let classB;
  let emptyClass;
  let assignmentA;
  let assignmentB;

  beforeEach(async () => {
    college = await College.create({
      name: 'Report Test College',
      code: 'RTC',
      domains: ['rtc.edu'],
      status: 'ACTIVE',
    });

    teacher = await User.create({
      name: 'Instructor Uday',
      email: 'uday@rtc.edu',
      passwordHash: 'hash',
      role: 'TEACHER',
      collegeId: college._id,
      approvalStatus: 'APPROVED',
    });

    otherTeacher = await User.create({
      name: 'Other Instructor',
      email: 'other@rtc.edu',
      passwordHash: 'hash',
      role: 'TEACHER',
      collegeId: college._id,
      approvalStatus: 'APPROVED',
    });

    studentA = await User.create({
      name: 'Student Alpha',
      email: 'alpha@rtc.edu',
      passwordHash: 'hash',
      role: 'STUDENT',
      collegeId: college._id,
      approvalStatus: 'APPROVED',
    });

    studentB = await User.create({
      name: 'Student Beta',
      email: 'beta@rtc.edu',
      passwordHash: 'hash',
      role: 'STUDENT',
      collegeId: college._id,
      approvalStatus: 'APPROVED',
    });

    // Class A: DSA (Teacher: Uday, Student: Alpha)
    classA = await Class.create({
      name: 'DSA',
      code: 'DSAA01',
      department: 'CS',
      languages: ['cpp'],
      teacherId: teacher._id,
      collegeId: college._id,
      students: [studentA._id],
    });

    // Class B: C++ (Teacher: Uday, Student: Beta)
    classB = await Class.create({
      name: 'C++',
      code: 'CPPB02',
      department: 'CS',
      languages: ['cpp'],
      teacherId: teacher._id,
      collegeId: college._id,
      students: [studentB._id],
    });

    // Empty Class (Teacher: Uday, no students)
    emptyClass = await Class.create({
      name: 'Advanced Systems Lab',
      code: 'ASLC03',
      department: 'CS',
      languages: ['cpp'],
      teacherId: teacher._id,
      collegeId: college._id,
      students: [],
    });

    // Assignment for Class A
    assignmentA = await Assignment.create({
      title: 'Binary Search Tree',
      description: 'Implement BST search',
      language: 'cpp',
      difficulty: 'MEDIUM',
      topics: ['Trees', 'Binary Search'],
      classId: classA._id,
      createdBy: teacher._id,
    });

    // Assignment for Class B
    assignmentB = await Assignment.create({
      title: 'Create a factorial program',
      description: 'Implement factorial in C++',
      language: 'cpp',
      difficulty: 'EASY',
      topics: [],
      classId: classB._id,
      createdBy: teacher._id,
    });

    // Submissions for Class A on Sep 22, 2026
    await Submission.create({
      assignmentId: assignmentA._id,
      userId: studentA._id,
      code: '#include <iostream>',
      language: 'cpp',
      status: 'PASSED',
      score: 80,
      attemptNumber: 1,
      createdAt: new Date('2026-09-22T10:00:00.000Z'),
      submittedAt: new Date('2026-09-22T10:00:00.000Z'),
    });

    // Submissions for Class B on Sep 25, 2026 (including 23:30 UTC on end date)
    await Submission.create({
      assignmentId: assignmentB._id,
      userId: studentB._id,
      code: '#include <iostream>',
      language: 'cpp',
      status: 'PASSED',
      score: 100,
      attemptNumber: 1,
      createdAt: new Date('2026-09-25T23:30:00.000Z'),
      submittedAt: new Date('2026-09-25T23:30:00.000Z'),
    });
  });

  it('TEST 1: Class A generates real student data within date range', async () => {
    const report = await generateWeeklyReportData({
      classId: classA._id,
      teacherId: teacher._id,
      userRole: 'TEACHER',
      startDate: '2026-09-20',
      endDate: '2026-09-27',
    });

    expect(report.statistics.totalSubmissions).toBe(1);
    expect(report.statistics.activeStudents).toBe(1);
    expect(report.statistics.averageScore).toBe(80);
    expect(report.summary).not.toContain('No student activity was recorded');
    expect(report.diagnostics.assignmentCount).toBe(1);
  });

  it('TEST 2: Class B generates real student data and captures activity on the end date', async () => {
    // End date is Sep 25: submission at 23:30 UTC on Sep 25 MUST be captured by normalization
    const report = await generateWeeklyReportData({
      classId: classB._id,
      teacherId: teacher._id,
      userRole: 'TEACHER',
      startDate: '2026-09-20',
      endDate: '2026-09-25',
    });

    expect(report.statistics.totalSubmissions).toBe(1);
    expect(report.statistics.activeStudents).toBe(1);
    expect(report.statistics.averageScore).toBe(100);
    expect(report.summary).not.toContain('No student activity was recorded');
  });

  it('TEST 3: Genuinely empty class accurately returns zero activity state', async () => {
    const report = await generateWeeklyReportData({
      classId: emptyClass._id,
      teacherId: teacher._id,
      userRole: 'TEACHER',
      startDate: '2026-09-20',
      endDate: '2026-09-27',
    });

    expect(report.statistics.totalSubmissions).toBe(0);
    expect(report.statistics.activeStudents).toBe(0);
    expect(report.summary).toContain('No student activity was recorded');
  });

  it('TEST 4: Inactive period returns zero submissions for Class A', async () => {
    const report = await generateWeeklyReportData({
      classId: classA._id,
      teacherId: teacher._id,
      userRole: 'TEACHER',
      startDate: '2026-08-01',
      endDate: '2026-08-07',
    });

    expect(report.statistics.totalSubmissions).toBe(0);
    expect(report.statistics.activeStudents).toBe(0);
  });

  it('TEST 5: Unauthorized teacher is blocked from generating reports for another teacher class', async () => {
    await expect(
      generateWeeklyReportData({
        classId: classA._id,
        teacherId: otherTeacher._id,
        userRole: 'TEACHER',
        startDate: '2026-09-20',
        endDate: '2026-09-27',
      })
    ).rejects.toThrow('You do not have access to generate reports for this class');
  });

  it('TEST 6: ADMIN user has access to generate report for any class', async () => {
    const report = await generateWeeklyReportData({
      classId: classA._id,
      teacherId: otherTeacher._id,
      userRole: 'ADMIN',
      startDate: '2026-09-20',
      endDate: '2026-09-27',
    });

    expect(report.statistics.totalSubmissions).toBe(1);
    expect(report.statistics.activeStudents).toBe(1);
  });
});
