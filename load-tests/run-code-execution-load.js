const path = require('path');
const fs = require('fs');

const tokens = JSON.parse(fs.readFileSync(path.join(__dirname, 'tokens.json'), 'utf8'));
const assignmentId = tokens.assignmentId;

const CODE_PAYLOADS = {
  python: {
    language: 'python',
    code: `import sys
lines = sys.stdin.read().strip()
print(lines)`
  },
  c: {
    language: 'c',
    code: `#include <stdio.h>
int main() {
    char buf[256];
    if (fgets(buf, sizeof(buf), stdin)) {
        printf("%s", buf);
    }
    return 0;
}`
  },
  cpp: {
    language: 'cpp',
    code: `#include <iostream>
#include <string>
using namespace std;
int main() {
    string s;
    if (getline(cin, s)) {
        cout << s << endl;
    }
    return 0;
}`
  },
  java: {
    language: 'java',
    code: `import java.util.Scanner;
public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextLine()) {
            System.out.println(sc.nextLine());
        }
    }
}`
  }
};

async function executeCode(studentToken, language, code) {
  const start = Date.now();
  try {
    const res = await fetch('http://localhost:3000/api/submissions/run', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${studentToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assignmentId,
        language,
        code
      })
    });
    const duration = Date.now() - start;
    const data = await res.json();
    return { ok: res.ok, status: res.status, duration, data };
  } catch (err) {
    return { ok: false, status: 500, duration: Date.now() - start, error: err.message };
  }
}

async function run() {
  console.log(`\n======================================================================`);
  console.log(`PHASE 11 — DOCKER CODE EXECUTION LOAD & ISOLATION TEST`);
  console.log(`======================================================================`);

  const student = tokens.students[0];
  const langResults = {};

  // 1. Test individual languages
  for (const [lang, payload] of Object.entries(CODE_PAYLOADS)) {
    console.log(`\nTesting ${lang.toUpperCase()} execution in Docker container...`);
    const res = await executeCode(student.token, payload.language, payload.code);
    console.log(`-> ${lang.toUpperCase()}: status=${res.status}, duration=${res.duration}ms, resultStatus=${res.data?.data?.status || res.data?.status || 'OK'}`);
    langResults[lang] = {
      status: res.status,
      durationMs: res.duration,
      resultStatus: res.data?.data?.status || res.data?.status,
      passedCount: res.data?.data?.passedCount ?? res.data?.passedCount
    };
  }

  // 2. Test concurrent executions across 5 students simultaneously
  console.log(`\n--- Testing Concurrent Code Execution (5 simultaneous containers) ---`);
  const concurrentStart = Date.now();
  const concurrentTasks = tokens.students.slice(0, 5).map((s, idx) => {
    const langKeys = ['python', 'cpp', 'c', 'python', 'cpp'];
    const chosenLang = langKeys[idx];
    return executeCode(s.token, chosenLang, CODE_PAYLOADS[chosenLang].code);
  });

  const batchResults = await Promise.all(concurrentTasks);
  const totalConcurrentTime = Date.now() - concurrentStart;
  const successfulExecutions = batchResults.filter(r => r.ok).length;
  const avgDuration = batchResults.reduce((acc, r) => acc + r.duration, 0) / batchResults.length;

  console.log(`Completed 5 concurrent Docker executions in ${totalConcurrentTime}ms`);
  console.log(`Success rate: ${successfulExecutions}/5 (${(successfulExecutions/5*100).toFixed(0)}%)`);
  console.log(`Average container lifecycle & test execution: ${avgDuration.toFixed(1)}ms`);

  const summary = {
    languages: langResults,
    concurrency: {
      concurrentContainers: 5,
      totalDurationMs: totalConcurrentTime,
      avgDurationMs: parseFloat(avgDuration.toFixed(1)),
      successfulExecutions,
      successRate: `${(successfulExecutions/5*100).toFixed(0)}%`
    }
  };

  fs.writeFileSync(path.join(__dirname, 'code-execution-load-results.json'), JSON.stringify(summary, null, 2));
  console.log('\nSaved code execution results to code-execution-load-results.json');
}

run().catch(console.error);
