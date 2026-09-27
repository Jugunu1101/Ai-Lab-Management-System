const { executeTestCases, normalizeOutput } = require('../../src/services/code-executor/test-case.service');

describe('Nested Number Triangle Pattern - Execution & Judge Regression Suite', () => {
  jest.setTimeout(30000);

  describe('normalizeOutput Deterministic Normalization Tests', () => {
    it('normalizes CRLF and trailing spaces cleanly without altering content', () => {
      const crlfWithTrailing = '1 \r\n1 2 \r\n1 2 3 \r\n';
      const cleanLF = '1\n1 2\n1 2 3';
      expect(normalizeOutput(crlfWithTrailing)).toBe(cleanLF);
    });

    it('handles single line and empty output gracefully', () => {
      expect(normalizeOutput('1 \n')).toBe('1');
      expect(normalizeOutput('')).toBe('');
      expect(normalizeOutput(null)).toBe('');
    });
  });

  describe('C++ Pattern Solution Execution (N=1, N=2, N=3, N=4)', () => {
    const solutionCode = `#include <iostream>
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

    const testCases = [
      { input: '3', expectedOutput: '1\n1 2\n1 2 3', isHidden: false },
      { input: '1', expectedOutput: '1', isHidden: false },
      { input: '4', expectedOutput: '1\n1 2\n1 2 3\n1 2 3 4', isHidden: true },
      { input: '2', expectedOutput: '1\n1 2', isHidden: true },
    ];

    it('accurately judges all test cases as PASS including N=3', async () => {
      const result = await executeTestCases({
        code: solutionCode,
        language: 'cpp',
        testCases,
        timeoutMs: 5000,
      });

      expect(result.status).toBe('PASSED');
      expect(result.score).toBe(100);

      // Verify N=3 specifically
      const tc3 = result.testResults.find((r) => testCases[r.testCaseIndex].input === '3');
      expect(tc3).toBeDefined();
      expect(tc3.passed).toBe(true);
      expect(tc3.status).toBe('PASSED');
      expect(tc3.actualOutput).toBe('1\n1 2\n1 2 3');
      expect(tc3.expectedOutput).toBe('1\n1 2\n1 2 3');

      // Verify N=1
      const tc1 = result.testResults.find((r) => testCases[r.testCaseIndex].input === '1');
      expect(tc1.passed).toBe(true);
      expect(tc1.actualOutput).toBe('1');

      // Verify N=2
      const tc2 = result.testResults.find((r) => testCases[r.testCaseIndex].input === '2');
      expect(tc2.passed).toBe(true);
      expect(tc2.actualOutput).toBe('1\n1 2');

      // Verify N=4
      const tc4 = result.testResults.find((r) => testCases[r.testCaseIndex].input === '4');
      expect(tc4.passed).toBe(true);
      expect(tc4.actualOutput).toBe('1\n1 2\n1 2 3\n1 2 3 4');
    });
  });
});
