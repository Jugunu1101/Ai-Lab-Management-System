const path = require('path');
const fs = require('fs');

const tokens = JSON.parse(fs.readFileSync(path.join(__dirname, 'tokens.json'), 'utf8'));

async function getOrCreateQuiz(studentToken) {
  const res = await fetch('http://localhost:3000/api/quizzes/today?language=cpp', {
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  const data = await res.json();
  const quiz = data.data?.quiz || data.quiz;
  return quiz;
}

async function submitQuiz(quizId, studentToken, answers) {
  const start = Date.now();
  const res = await fetch(`http://localhost:3000/api/quizzes/${quizId}/submit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${studentToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ answers })
  });
  const duration = Date.now() - start;
  const json = await res.json();
  return { status: res.status, ok: res.ok, duration, data: json };
}

async function run() {
  console.log(`\n======================================================================`);
  console.log(`PHASE 9 — QUIZ SUBMISSION CONCURRENCY LOAD TEST`);
  console.log(`======================================================================`);

  const student = tokens.students[0];
  console.log(`Fetching today's quiz for ${student.email}...`);
  const quiz = await getOrCreateQuiz(student.token);

  if (!quiz || !quiz._id || !quiz.questions) {
    console.error('Could not fetch quiz for submission test:', quiz);
    return;
  }

  console.log(`Fetched Quiz ID: ${quiz._id} with ${quiz.questions.length} questions`);

  // Prepare standard answers
  const answers = quiz.questions.map((q, idx) => ({
    questionIndex: idx,
    selectedAnswer: 'A'
  }));

  // TEST A: Two simultaneous submissions from the same student (Race condition test)
  console.log('\n--- Test A: Two Simultaneous Submissions from Same Student ---');
  const [sub1, sub2] = await Promise.all([
    submitQuiz(quiz._id, student.token, answers),
    submitQuiz(quiz._id, student.token, answers)
  ]);
  console.log(`Submission 1: status=${sub1.status}, duration=${sub1.duration}ms, score=${sub1.data?.data?.score ?? sub1.data?.score}`);
  console.log(`Submission 2: status=${sub2.status}, duration=${sub2.duration}ms, score=${sub2.data?.data?.score ?? sub2.data?.score}`);

  // TEST B: Multi-student concurrent submissions across all 10 students
  console.log('\n--- Test B: Concurrent Submissions Across 10 Separate Students ---');
  const studentQuizzes = await Promise.all(
    tokens.students.map(s => getOrCreateQuiz(s.token))
  );

  const startBatch = Date.now();
  const results = await Promise.all(
    tokens.students.map(async (s, i) => {
      const q = studentQuizzes[i] || quiz;
      const ans = (q.questions || quiz.questions).map((item, idx) => ({
        questionIndex: idx,
        selectedAnswer: item.correctAnswer ? item.correctAnswer.charAt(0) : 'A'
      }));
      return submitQuiz(q._id, s.token, ans);
    })
  );
  const totalBatchDuration = Date.now() - startBatch;

  const successful = results.filter(r => r.ok).length;
  const avgDuration = results.reduce((acc, r) => acc + r.duration, 0) / results.length;
  const durations = results.map(r => r.duration).sort((a, b) => a - b);
  const p50 = durations[Math.floor(durations.length * 0.5)];
  const p95 = durations[Math.floor(durations.length * 0.95)];

  console.log(`Completed ${results.length} concurrent submissions in ${totalBatchDuration}ms:`);
  console.log(`Success rate: ${successful}/${results.length} (${(successful/results.length*100).toFixed(1)}%)`);
  console.log(`Latency: Average=${avgDuration.toFixed(1)}ms | p50=${p50}ms | p95=${p95}ms`);

  const summary = {
    testA_raceCondition: { sub1: { status: sub1.status, ms: sub1.duration }, sub2: { status: sub2.status, ms: sub2.duration } },
    testB_concurrentStudents: {
      total: results.length,
      successful,
      avgDuration: parseFloat(avgDuration.toFixed(1)),
      p50,
      p95,
      totalBatchDuration
    }
  };

  fs.writeFileSync(path.join(__dirname, 'quiz-submission-load-results.json'), JSON.stringify(summary, null, 2));
  console.log('\nSaved quiz submission results to quiz-submission-load-results.json');
}

run().catch(console.error);
