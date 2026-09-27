const { executeAllTestCases } = require('../../src/services/code-executor/code-executor.service');

describe('CodeExecutorService Unit Tests', () => {
  jest.setTimeout(30000);

  it('Test 1: should compile and execute C++ Hello World', async () => {
    const code = `#include <iostream>
using namespace std;

int main() {
    cout << "Hello";
    return 0;
}`;
    const result = await executeAllTestCases({
      code,
      language: 'cpp',
      testCases: [{ input: '' }],
      timeoutMs: 5000,
    });
    expect(result.status).toBe('PASSED');
    expect(result.testResults[0].stdout.trim()).toBe('Hello');
  });

  it('Test 2: should compile and execute C++ with stdin', async () => {
    const code = `#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    cout << n * n;
    return 0;
}`;
    const result = await executeAllTestCases({
      code,
      language: 'cpp',
      testCases: [{ input: '5' }],
      timeoutMs: 5000,
    });
    expect(result.status).toBe('PASSED');
    expect(result.testResults[0].stdout.trim()).toBe('25');
  });

  it('Test 3: should execute C++ factorial program correctly', async () => {
    const code = `#include <iostream>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int n;
    cin >> n;

    long long factorial = 1;

    for (int i = 1; i <= n; i++) {
        factorial *= i;
    }

    cout << factorial << '\\n';

    return 0;
}`;
    const result = await executeAllTestCases({
      code,
      language: 'cpp',
      testCases: [{ input: '5' }],
      timeoutMs: 5000,
    });
    expect(result.status).toBe('PASSED');
    expect(result.testResults[0].stdout.trim()).toBe('120');
  });

  it('Test 4: should execute Python program with stdin', async () => {
    const code = `import sys
n = int(sys.stdin.read().strip())
print(n * n)`;
    const result = await executeAllTestCases({
      code,
      language: 'python',
      testCases: [{ input: '5' }],
      timeoutMs: 5000,
    });
    expect(result.status).toBe('PASSED');
    expect(result.testResults[0].stdout.trim()).toBe('25');
  });

  it('Test 5: should return COMPILE_ERROR on invalid C++ code', async () => {
    const code = `#include <iostream>
using namespace std;
int main() {
    this_is_an_invalid_token_error;
    return 0;
}`;
    const result = await executeAllTestCases({
      code,
      language: 'cpp',
      testCases: [{ input: '' }],
      timeoutMs: 5000,
    });
    expect(result.status).toBe('COMPILE_ERROR');
    expect(result.error).toMatch(/this_is_an_invalid_token_error/);
  });

  it('Test 6: should detect runtime error or non-zero exit code', async () => {
    const code = `#include <iostream>
#include <cstdlib>
using namespace std;
int main() {
    exit(1);
}`;
    const result = await executeAllTestCases({
      code,
      language: 'cpp',
      testCases: [{ input: '' }],
      timeoutMs: 5000,
    });
    expect(result.status).toBe('RUNTIME_ERROR');
  });

  it('Test 7: should detect timeout / infinite loop', async () => {
    const code = `#include <iostream>
using namespace std;
int main() {
    while (true) {}
    return 0;
}`;
    const result = await executeAllTestCases({
      code,
      language: 'cpp',
      testCases: [{ input: '' }],
      timeoutMs: 1000,
    });
    expect(result.status).toBe('TIME_LIMIT_EXCEEDED');
  });
});
