const { executeCode } = require("./code-executor.service");

const normalizeOutput = (output) => {
  return (output || "")
    .trim()
    .replace(/\r\n/g, "\n");
};

const executeTestCases = async ({
  code,
  language = "javascript",
  testCases = [],
  timeoutMs = 5000,
}) => {
  const results = [];
  let overallStatus = "COMPLETED";

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    const startTime = Date.now();

    const result = await executeCode({
      code,
      language,
      input: testCase.input || "",
      timeoutMs,
    });

    const executionTime = Date.now() - startTime;
    const actualOutput = normalizeOutput(result.stdout);
    const expectedOutput = normalizeOutput(testCase.expectedOutput || "");

    const passed =
      result.status === "COMPLETED" && actualOutput === expectedOutput;

    let error = result.stderr || "";

    if (result.status === "TIMEOUT") {
      error = "Execution timed out";
      overallStatus = "TIMEOUT";
    } else if (result.status === "ERROR") {
      overallStatus = "ERROR";
    } else if (result.status === "FAILED" || !passed) {
      if (overallStatus !== "TIMEOUT" && overallStatus !== "ERROR") {
        overallStatus = "FAILED";
      }
    }

    results.push({
      testCaseIndex: i,
      passed,
      actualOutput,
      expectedOutput,
      executionTime,
      error,
    });
  }

  const passedTests = results.filter((result) => result.passed).length;
  const score =
    testCases.length === 0
      ? 0
      : Math.round((passedTests / testCases.length) * 100);

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