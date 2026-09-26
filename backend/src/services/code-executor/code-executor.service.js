const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");

const RUNNER_CONFIGS = {
  javascript: {
    image: "node:22-alpine",
    filename: "main.js",
    compile: null,
    run: (file) => ["node", file],
  },
  python: {
    image: "python:3.11-alpine",
    filename: "solution.py",
    compile: null,
    run: (file) => ["python", file],
  },
  c: {
    image: "gcc:latest",
    filename: "solution.c",
    compile: (file) => ["gcc", "-O2", file, "-o", "/tmp/solution"],
    run: () => ["/tmp/solution"],
  },
  cpp: {
    image: "gcc:latest",
    filename: "solution.cpp",
    compile: (file) => ["g++", "-O2", file, "-o", "/tmp/solution"],
    run: () => ["/tmp/solution"],
  },
  java: {
    image: "eclipse-temurin:21-alpine",
    filename: "Solution.java",
    compile: (file) => ["javac", file, "-d", "/tmp"],
    run: () => ["java", "-cp", "/tmp", "Solution"],
  },
};

const execDocker = async (args, input = "", timeoutMs = 5000) => {
  return new Promise((resolve) => {
    const proc = spawn("docker", args);
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    if (input) {
      proc.stdin.write(input.endsWith("\n") ? input : input + "\n");
    }
    proc.stdin.end();

    proc.stdout.on("data", (data) => (stdout += data.toString()));
    proc.stderr.on("data", (data) => (stderr += data.toString()));

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill("SIGKILL");
    }, timeoutMs);

    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({ timedOut, exitCode: code, stdout, stderr });
    });
    proc.on("error", (error) => {
      clearTimeout(timer);
      resolve({ timedOut: false, exitCode: -1, stdout, stderr: error.message });
    });
  });
};

const executeAllTestCases = async ({
  code,
  language = "javascript",
  testCases = [],
  timeoutMs = 5000,
}) => {
  const normalizedLang = (language || "").toLowerCase().trim();
  const runner = RUNNER_CONFIGS[normalizedLang];

  if (!runner) {
    throw new Error(`Unsupported language "${language}"`);
  }

  const executionId = crypto.randomUUID();
  const tempDir = path.join(os.tmpdir(), `code-execution-${executionId}`);
  const codeFile = path.join(tempDir, runner.filename);
  const containerFilePath = `/app/${runner.filename}`;
  const containerName = `code-exec-${executionId}`;

  try {
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(codeFile, code, "utf8");

    // 1. VERIFY HOST FILE
    const fileExists = await fs.access(codeFile).then(() => true).catch(() => false);
    let fileSize = 0;
    if (fileExists) {
      const stats = await fs.stat(codeFile);
      fileSize = stats.size;
    }
    console.log(`[CodeExecutor] VERIFY HOST FILE:`);
    console.log(`  workspace path: ${tempDir}`);
    console.log(`  solution path: ${codeFile}`);
    console.log(`  fileExists: ${fileExists}`);
    console.log(`  fileSize: ${fileSize}`);

    // Start a sleeping container
    const startArgs = [
      "run",
      "-d",
      "--name", containerName,
      "--network", "none",
      "--memory", "128m",
      "--cpus", "0.5",
      "--pids-limit", "64",
      "--read-only",
      "--tmpfs", "/tmp:rw,nosuid,nodev,exec,size=64m",
      "--tmpfs", "/app:rw,nosuid,nodev,exec,size=64m",
      runner.image,
      "tail", "-f", "/dev/null"
    ];
    console.log(`[CodeExecutor] Starting container with image: ${runner.image} and args:`, startArgs);
    console.log(`[CodeExecutor] Starting container with image: ${runner.image} and args:`, startArgs);

    const startRes = await execDocker(startArgs, "", 10000);
    if (startRes.exitCode !== 0) {
      return {
        status: "INTERNAL_ERROR",
        error: "Failed to start execution container",
        testResults: [],
        score: 0
      };
    }

    // Write solution file into container via stdin (Bypasses Docker-out-of-Docker mount issues)
    await execDocker(["exec", "-i", containerName, "sh", "-c", `cat > /app/${runner.filename}`], code, 5000);

    // 2. VERIFY DOCKER MOUNT
    console.log(`[CodeExecutor] VERIFY DOCKER MOUNT:`);
    const lsRes = await execDocker(["exec", containerName, "ls", "-la", "/app"], "", 5000);
    console.log(`[CodeExecutor] ls -la /app inside container:\n${lsRes.stdout}\n${lsRes.stderr}`);
    const testFileRes = await execDocker(["exec", containerName, "test", "-f", `/app/${runner.filename}`], "", 5000);
    console.log(`[CodeExecutor] test -f /app/${runner.filename} exit code: ${testFileRes.exitCode}`);

    // Compile if needed
    if (runner.compile) {
      const compileCmd = runner.compile(containerFilePath);
      const compileArgs = ["exec", containerName, ...compileCmd];
      console.log(`[CodeExecutor] Compiling with compileArgs:`, compileArgs);
      const compileRes = await execDocker(compileArgs, "", 10000);
      console.log(`[CodeExecutor] compileRes:`, compileRes);
      
      if (compileRes.timedOut) {
        return {
          status: "COMPILE_ERROR",
          error: "Compilation timed out",
          testResults: [],
          score: 0
        };
      }
      
      if (compileRes.exitCode !== 0) {
        return {
          status: "COMPILE_ERROR",
          error: compileRes.stderr || "Compilation failed",
          testResults: [],
          score: 0
        };
      }
    }

    // Run test cases
    const results = [];
    let overallStatus = "PASSED";

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const inputFilename = `input_${i}.txt`;
      const inputFilePath = path.join(tempDir, inputFilename);
      await fs.writeFile(inputFilePath, testCase.input || "", "utf8");

      // Write input to container
      await execDocker(["exec", "-i", containerName, "sh", "-c", `cat > /app/${inputFilename}`], testCase.input || "", 5000);

      const runCmd = runner.run(containerFilePath);
      const cmdStr = runCmd.join(" ");
      const runArgs = ["exec", containerName, "sh", "-c", `${cmdStr} < /app/${inputFilename}`];
      console.log(`[CodeExecutor] Executing test case ${i} with runArgs:`, runArgs);
      
      const startTime = Date.now();
      // Add 2000ms buffer for Docker exec overhead
      const res = await execDocker(runArgs, "", timeoutMs + 2000);
      const executionTime = Date.now() - startTime;

      let status = "PASSED";
      let error = res.stderr || "";

      if (res.timedOut || executionTime > timeoutMs) {
        status = "TIME_LIMIT_EXCEEDED";
        error = `Execution timed out after ${timeoutMs}ms (internal limit exceeded)`;
        overallStatus = "TIME_LIMIT_EXCEEDED";
      } else if (res.exitCode !== 0) {
        status = "RUNTIME_ERROR";
        if (!error) error = `Process exited with code ${res.exitCode}`;
        if (overallStatus === "PASSED") overallStatus = "RUNTIME_ERROR";
      }

      results.push({
        testCaseIndex: i,
        status,
        stdout: res.stdout,
        stderr: error,
        executionTime,
        exitCode: res.exitCode
      });
    }

    // Cleanup container
    await execDocker(["rm", "-f", containerName], "", 5000);

    return {
      status: overallStatus,
      testResults: results,
      score: 0 // Will be computed in test-case.service.js
    };

  } finally {
    await execDocker(["rm", "-f", containerName], "", 5000).catch(() => {});
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
};

module.exports = {
  executeAllTestCases,
  RUNNER_CONFIGS,
};