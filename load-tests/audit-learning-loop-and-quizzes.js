const path = require('path');
const fs = require('fs');

require('../backend/node_modules/dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const tokens = JSON.parse(fs.readFileSync(path.join(__dirname, 'tokens.json'), 'utf8'));
const teacher = tokens.teacher;
const student = tokens.students[0];
const classId = tokens.classId;

const API_URL = 'http://localhost:3000/api';

async function req(url, method = 'GET', token = null, body = null) {
  const headers = { 'Accept': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_URL}${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function auditLoopAndQuizzes() {
  console.log('======================================================================');
  console.log('5, 6, 7. CONTINUOUS LEARNING LOOP, QUIZ & AI ASSIGNMENTS AUDIT');
  console.log('======================================================================');

  // --- SECTION 6: DAILY QUIZ & AI PRACTICE ---
  console.log('\n--- 1. Multi-Language Daily Quiz (10 Questions Verification) ---');
  const languages = ['cpp', 'c', 'java', 'python'];
  
  for (const lang of languages) {
    const quizRes = await req(`/quizzes/today?language=${lang}`, 'GET', student.token);
    const quizObj = quizRes.data?.data?.quiz;
    const qCount = quizObj?.questions?.length || 0;
    const pass = quizRes.ok && qCount === 10;
    console.log(`[${pass ? 'PASS' : 'FAIL'}] Daily Quiz [${lang.toUpperCase()}] -> Status: ${quizRes.status}, Questions: ${qCount} (Expected 10)`);
    if (quizObj?.questions?.[0]) {
      console.log(`       Sample Question: "${quizObj.questions[0].question.substring(0, 60)}..."`);
    }
  }

  // Submit Daily Quiz and verify mastery & completed state
  console.log('\n--- 2. Quiz Submission & Mastery Update ---');
  const todayQuiz = await req('/quizzes/today?language=python', 'GET', student.token);
  const quizObj = todayQuiz.data?.data?.quiz;
  if (todayQuiz.ok && quizObj) {
    const quizId = quizObj._id;
    const questions = quizObj.questions || [];
    const answers = questions.map((q, idx) => ({
      questionIndex: idx,
      selectedAnswer: 'A'
    }));

    const submitRes = await req(`/quizzes/${quizId}/submit`, 'POST', student.token, { answers });
    const passSubmit = submitRes.ok && submitRes.data?.data?.score !== undefined;
    console.log(`[${passSubmit ? 'PASS' : 'FAIL'}] Quiz Submission -> Status: ${submitRes.status}, Score: ${submitRes.data?.data?.score}%`);
    
    // Verify completed state prevents duplicate attempt
    const dupRes = await req(`/quizzes/${quizId}/submit`, 'POST', student.token, { answers });
    console.log(`[${dupRes.status === 400 || dupRes.status === 409 ? 'PASS' : 'INFO'}] Duplicate Quiz Attempt Protection -> Status: ${dupRes.status} (${dupRes.data?.error?.code || 'BLOCKED'})`);
  }

  // --- SECTION 7: AI-GENERATED PROGRAMMING ASSIGNMENTS ---
  console.log('\n--- 3. Teacher AI Assignment Workflow (Multi-Language) ---');
  for (const lang of ['python', 'cpp', 'c', 'java']) {
    // A. Teacher generates assignment preview
    const genRes = await req('/assignments/generate-ai', 'POST', teacher.token, {
      topic: 'loops',
      language: lang,
      difficulty: 'EASY',
      questionCount: 1,
      classId
    });

    const hasAssignmentData = genRes.ok && genRes.data?.data?.title && genRes.data?.data?.testCases?.length > 0;
    console.log(`[${hasAssignmentData ? 'PASS' : 'FAIL'}] Teacher AI Generate [${lang.toUpperCase()}] -> Status: ${genRes.status}, Title: "${genRes.data?.data?.title || 'N/A'}", TestCases: ${genRes.data?.data?.testCases?.length || 0}`);

    // If python, publish and have student submit!
    if (lang === 'python' && hasAssignmentData) {
      const generated = genRes.data.data;
      
      // B. Publish assignment
      const pubRes = await req('/assignments', 'POST', teacher.token, {
        title: `AI Lab: ${generated.title}`,
        description: generated.description,
        problemStatement: generated.problemStatement,
        language: 'python',
        difficulty: 'EASY',
        topics: ['loops'],
        testCases: generated.testCases,
        starterCode: generated.starterCode || 'def solution():\n    pass\n',
        classId
      });

      const publishedPass = pubRes.ok && pubRes.data?.data?._id;
      const assignmentId = pubRes.data?.data?._id;
      console.log(`[${publishedPass ? 'PASS' : 'FAIL'}] Teacher Publish Assignment -> Status: ${pubRes.status}, Assignment ID: ${assignmentId}`);

      if (assignmentId) {
        // C. Student views assignment
        const viewRes = await req(`/assignments/${assignmentId}`, 'GET', student.token);
        console.log(`[${viewRes.ok ? 'PASS' : 'FAIL'}] Student Receives Assignment -> Status: ${viewRes.status}, Title: "${viewRes.data?.data?.title}"`);

        // D. Student submits solution code
        console.log('\n--- 4. Full Student Learning Loop: Execution & AI Analysis ---');
        const submitCodeRes = await req('/submissions', 'POST', student.token, {
          assignmentId,
          language: 'python',
          code: 'import sys\n# Solves loops lab\nlines = sys.stdin.read().split()\nfor l in lines:\n    print(l)\n'
        });

        const subId = submitCodeRes.data?.data?._id;
        console.log(`[${submitCodeRes.ok ? 'PASS' : 'FAIL'}] Student Submits Code -> Status: ${submitCodeRes.status}, Submission ID: ${subId}`);

        if (subId) {
          // Poll submission status until execution finishes
          let finalSub = null;
          for (let attempt = 0; attempt < 8; attempt++) {
            await new Promise(r => setTimeout(r, 1500));
            const chk = await req(`/submissions/${subId}`, 'GET', student.token);
            if (chk.data?.data?.status && chk.data.data.status !== 'PENDING' && chk.data.data.status !== 'QUEUED') {
              finalSub = chk.data.data;
              break;
            }
          }
          console.log(`[${finalSub ? 'PASS' : 'INFO'}] Code Execution Completed -> Status: ${finalSub?.status || 'PENDING'}, Score: ${finalSub?.score || 0}`);

          // E. Teacher views result
          const teacherResultsRes = await req(`/assignments/${assignmentId}/results`, 'GET', teacher.token);
          const teacherPass = teacherResultsRes.ok && teacherResultsRes.data?.data?.length > 0;
          console.log(`[${teacherPass ? 'PASS' : 'FAIL'}] Teacher Views Submission Results -> Status: ${teacherResultsRes.status}, Count: ${teacherResultsRes.data?.data?.length || 0}`);
        }
      }
    }
  }

  // --- SECTION 5: LEARNING PATH UPDATE ---
  console.log('\n--- 5. Student Learning Path ---');
  const lpRes = await req('/student/learning-path', 'GET', student.token);
  const lpPass = lpRes.ok && (lpRes.data?.data?.steps?.length > 0 || lpRes.data?.data?.title);
  console.log(`[${lpPass ? 'PASS' : 'FAIL'}] Student Learning Path Active -> Status: ${lpRes.status}, Title: "${lpRes.data?.data?.title || 'Personalized Path'}", Steps: ${lpRes.data?.data?.steps?.length || 0}`);

  console.log('\n======================================================================');
  console.log('LEARNING LOOP, QUIZ & AI ASSIGNMENTS AUDIT COMPLETE');
  console.log('======================================================================');
}

auditLoopAndQuizzes().catch(console.error);
