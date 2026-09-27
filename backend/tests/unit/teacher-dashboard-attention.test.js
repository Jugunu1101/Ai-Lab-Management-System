const { getTeacherDashboard } = require('../../src/modules/analytics/analytics.service');
const User = require('../../src/modules/users/user.model');
const College = require('../../src/modules/colleges/college.model');
const Class = require('../../src/modules/classes/class.model');
const Assignment = require('../../src/modules/assignments/assignment.model');
const Submission = require('../../src/modules/submissions/submission.model');
const Progress = require('../../src/modules/progress/progress.model');

describe('Teacher Dashboard - Students Needing Attention (< 45% Rule)', () => {
  let college;
  let teacherA;
  let teacherB;
  let student44;
  let student45;
  let student46;
  let studentOther;
  let classA;
  let classB;
  let assignmentA;

  beforeEach(async () => {
    college = await College.create({
      name: 'Attention Test College',
      code: 'ATC',
      domains: ['atc.edu'],
      status: 'ACTIVE',
    });

    teacherA = await User.create({
      name: 'Teacher Alpha',
      email: 'teachera@atc.edu',
      passwordHash: 'hash',
      role: 'TEACHER',
      collegeId: college._id,
      approvalStatus: 'APPROVED',
    });

    teacherB = await User.create({
      name: 'Teacher Beta',
      email: 'teacherb@atc.edu',
      passwordHash: 'hash',
      role: 'TEACHER',
      collegeId: college._id,
      approvalStatus: 'APPROVED',
    });

    student44 = await User.create({
      name: 'Student 44',
      email: 's44@atc.edu',
      passwordHash: 'hash',
      role: 'STUDENT',
      collegeId: college._id,
      approvalStatus: 'APPROVED',
    });

    student45 = await User.create({
      name: 'Student 45',
      email: 's45@atc.edu',
      passwordHash: 'hash',
      role: 'STUDENT',
      collegeId: college._id,
      approvalStatus: 'APPROVED',
    });

    student46 = await User.create({
      name: 'Student 46',
      email: 's46@atc.edu',
      passwordHash: 'hash',
      role: 'STUDENT',
      collegeId: college._id,
      approvalStatus: 'APPROVED',
    });

    studentOther = await User.create({
      name: 'Student Other Class',
      email: 'sother@atc.edu',
      passwordHash: 'hash',
      role: 'STUDENT',
      collegeId: college._id,
      approvalStatus: 'APPROVED',
    });

    classA = await Class.create({
      name: 'CS101 Alpha',
      code: 'CS101A',
      teacherId: teacherA._id,
      collegeId: college._id,
      students: [student44._id, student45._id, student46._id],
    });

    classB = await Class.create({
      name: 'CS102 Beta',
      code: 'CS102B',
      teacherId: teacherB._id,
      collegeId: college._id,
      students: [studentOther._id],
    });

    assignmentA = await Assignment.create({
      title: 'Loops Assignment',
      description: 'Practice loops in JS',
      language: 'javascript',
      difficulty: 'EASY',
      topics: ['loops'],
      classId: classA._id,
      createdBy: teacherA._id,
    });

    // Student 44: mastery = 44%
    await Progress.create({
      studentId: student44._id,
      language: 'javascript',
      topic: 'loops',
      masteryScore: 44,
    });

    // Student 45: mastery = 45% (Boundary case: exactly 45% -> should NOT be flagged)
    await Progress.create({
      studentId: student45._id,
      language: 'javascript',
      topic: 'loops',
      masteryScore: 45,
    });

    // Student 46: mastery = 46% (Above threshold -> should NOT be flagged)
    await Progress.create({
      studentId: student46._id,
      language: 'javascript',
      topic: 'loops',
      masteryScore: 46,
    });

    // Student Other in Class B: mastery = 30% (Under Teacher B only)
    await Progress.create({
      studentId: studentOther._id,
      language: 'javascript',
      topic: 'loops',
      masteryScore: 30,
    });
  });

  it('TEST 1: flags student with mastery = 44% (mastery < 45)', async () => {
    const dashboard = await getTeacherDashboard({ teacherId: teacherA._id, role: 'TEACHER' });
    const flagged = dashboard.atRiskStudents.find(s => s.studentId.toString() === student44._id.toString());
    expect(flagged).toBeDefined();
    expect(flagged.score).toBe(44);
    expect(flagged.reason).toContain('Mastery is below the 45% attention threshold');
  });

  it('TEST 2: does NOT flag student with mastery = 45% based on mastery (45 is not < 45)', async () => {
    const dashboard = await getTeacherDashboard({ teacherId: teacherA._id, role: 'TEACHER' });
    const flagged = dashboard.atRiskStudents.find(s => s.studentId.toString() === student45._id.toString());
    expect(flagged).toBeUndefined();
  });

  it('TEST 3: does NOT flag student with mastery = 46% based on mastery (46 > 45)', async () => {
    const dashboard = await getTeacherDashboard({ teacherId: teacherA._id, role: 'TEACHER' });
    const flagged = dashboard.atRiskStudents.find(s => s.studentId.toString() === student46._id.toString());
    expect(flagged).toBeUndefined();
  });

  it('TEST 4: enforces Teacher Isolation — Teacher A cannot see Student from Teacher B', async () => {
    const dashboardA = await getTeacherDashboard({ teacherId: teacherA._id, role: 'TEACHER' });
    const foundOtherInA = dashboardA.atRiskStudents.find(s => s.studentId.toString() === studentOther._id.toString());
    expect(foundOtherInA).toBeUndefined();

    const dashboardB = await getTeacherDashboard({ teacherId: teacherB._id, role: 'TEACHER' });
    const foundOtherInB = dashboardB.atRiskStudents.find(s => s.studentId.toString() === studentOther._id.toString());
    expect(foundOtherInB).toBeDefined();
    expect(foundOtherInB.score).toBe(30);
  });

  it('TEST 5: returns empty atRiskStudents when all students have mastery >= 45%', async () => {
    // Update student44 to 55%
    await Progress.updateOne({ studentId: student44._id }, { $set: { masteryScore: 55 } });
    const dashboard = await getTeacherDashboard({ teacherId: teacherA._id, role: 'TEACHER' });
    expect(dashboard.atRiskStudents).toHaveLength(0);
  });
});
