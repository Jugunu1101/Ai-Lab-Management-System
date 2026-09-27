const { executeTestCases, normalizeOutput } = require('../src/services/code-executor/test-case.service.js');

const codeWithSpacesInRow = `#include <iostream>
using namespace std;

int main() {
    int N;
    if (cin >> N) {
        for (int i = 1; i <= N; i++) {
            for (int j = 1; j <= i; j++) {
                cout << j << " ";
            }
            cout << "\\n";
        }
    }
    return 0;
}
`;

const codeRightAlignedAttempt = `#include <iostream>
using namespace std;

int main() {
    int N;
    if (cin >> N) {
        for (int i = 1; i <= N; i++) {
            for (int j = 1; j <= N - i; j++) {
                cout << " ";
            }
            for (int j = 1; j <= i; j++) {
                cout << j << " ";
            }
            cout << "\\n";
        }
    }
    return 0;
}
`;

const testCases = [
  { input: '3', expectedOutput: '1\n1 2\n1 2 3' },
  { input: '1', expectedOutput: '1' },
  { input: '4', expectedOutput: '1\n1 2\n1 2 3\n1 2 3 4' },
  { input: '2', expectedOutput: '1\n1 2' }
];

async function run() {
  console.log('=== 1. Standard Number Triangle Solution ===');
  const res1 = await executeTestCases({
    code: codeWithSpacesInRow,
    language: 'cpp',
    testCases
  });
  console.log('Overall Status:', res1.status, 'Score:', res1.score);
  res1.testResults.forEach(tr => {
    console.log(`TC #${tr.testCaseIndex + 1} (N=${testCases[tr.testCaseIndex].input}): ${tr.passed ? 'PASS' : 'WRONG ANSWER'}`);
    console.log(`  Actual:   ${JSON.stringify(tr.actualOutput)}`);
    console.log(`  Expected: ${JSON.stringify(tr.expectedOutput)}`);
  });

  console.log('\n=== 2. Attempt with leading spaces (as in student screenshot) ===');
  const res2 = await executeTestCases({
    code: codeRightAlignedAttempt,
    language: 'cpp',
    testCases
  });
  console.log('Overall Status:', res2.status, 'Score:', res2.score);
  res2.testResults.forEach(tr => {
    console.log(`TC #${tr.testCaseIndex + 1} (N=${testCases[tr.testCaseIndex].input}): ${tr.passed ? 'PASS' : 'WRONG ANSWER'}`);
    console.log(`  Actual:   ${JSON.stringify(tr.actualOutput)}`);
    console.log(`  Expected: ${JSON.stringify(tr.expectedOutput)}`);
    console.log(`  Actual Hex:   ${Buffer.from(tr.actualOutput).toString('hex')}`);
    console.log(`  Expected Hex: ${Buffer.from(tr.expectedOutput).toString('hex')}`);
  });
}

run().catch(console.error);
