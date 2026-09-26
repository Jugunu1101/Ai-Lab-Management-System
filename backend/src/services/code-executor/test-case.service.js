const { executeAllTestCases } = require("./code-executor.service");

const normalizeOutput = (output) => {
  return (output || "")
    .trim()
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, ""); // strip trailing spaces on each line
};

const executeTestCases = async ({
  code,
  language = "javascript",
  testCases = [],
  timeoutMs = 5000,
}) => {
  // Execute all test cases inside the executor
  const result = await executeAllTestCases({
    code,
    language,
    testCases,
    timeoutMs,
  });

  // If there was an internal/compile error, return immediately
  if (result.status === "COMPILE_ERROR" || result.status === "INTERNAL_ERROR") {
    return {
      status: result.status,
      testResults: testCases.map((tc, index) => ({
        testCaseIndex: index,
        passed: false,
        actualOutput: "",
        expectedOutput: tc.expectedOutput || "",
        executionTime: 0,
        error: result.error,
        status: result.status,
      })),
      score: 0,
    };
  }

  // Otherwise, evaluate each test case
  const results = [];
  let overallStatus = "PASSED";

  for (let i = 0; i < testCases.length; i++) {
    const execRes = result.testResults[i];
    const testCase = testCases[i];
    
    const actualOutput = normalizeOutput(execRes.stdout);
    const expectedOutput = normalizeOutput(testCase.expectedOutput || "");
    
    let passed = false;
    let tcStatus = execRes.status;
    let error = execRes.stderr;

    if (tcStatus === "PASSED") {
      if (actualOutput === expectedOutput) {
        passed = true;
      } else {
        tcStatus = "FAILED"; // Wrong Answer
      }
    }

    if (!passed && tcStatus !== "PASSED") {
      if (overallStatus === "PASSED") {
        overallStatus = tcStatus;
      } else if (overallStatus !== "TIME_LIMIT_EXCEEDED" && overallStatus !== "RUNTIME_ERROR") {
        // Prioritize TIME_LIMIT_EXCEEDED and RUNTIME_ERROR over FAILED
        overallStatus = tcStatus;
      }
    }

    results.push({
      testCaseIndex: i,
      passed,
      actualOutput,
      expectedOutput,
      executionTime: execRes.executionTime,
      error,
      status: tcStatus,
    });
  }

  const passedTests = results.filter((r) => r.passed).length;
  const score = testCases.length === 0 ? 0 : Math.round((passedTests / testCases.length) * 100);

  return {
    status: overallStatus,
    testResults: results,
    score,
  };
};

module.exports = {
  executeTestCases,
  normalizeOutput,
};