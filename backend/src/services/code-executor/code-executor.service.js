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

const LOCAL_RUNNER_CONFIGS = {
  javascript: {
    filename: "main.js",
    compile: null,
    run: (file) => [process.execPath, file],
  },
  python: {
    filename: "solution.py",
    compile: null,
    run: (file) => ["python", file],
  },
  c: {
    filename: "solution.c",
    compile: (file, dir) => {
      const exe = path.join(dir, process.platform === "win32" ? "solution.exe" : "solution");
      return {
        cmd: ["gcc", "-O2", file, "-o", exe],
        exe,
      };
    },
    run: (file, dir, exe) => [exe],
  },
  cpp: {
    filename: "solution.cpp",
    compile: (file, dir) => {
      const exe = path.join(dir, process.platform === "win32" ? "solution.exe" : "solution");
      return {
        cmd: ["g++", "-O2", file, "-o", exe],
        exe,
      };
    },
    run: (file, dir, exe) => [exe],
  },
  java: {
    filename: "Solution.java",
    compile: (file, dir) => {
      return {
        cmd: ["javac", file, "-d", dir],
        exe: null,
      };
    },
    run: (file, dir) => ["java", "-cp", dir, "Solution"],
  },
};

const execDocker = async (args, input = "", timeoutMs = 5000) => {
  return new Promise((resolve) => {
    let proc;
    try {
      proc = spawn("docker", args);
    } catch (err) {
      return resolve({ timedOut: false, exitCode: -1, stdout: "", stderr: err.message });
    }

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        proc.kill("SIGKILL");
      } catch (e) {}
    }, timeoutMs);

    if (input && proc.stdin) {
      try {
        proc.stdin.write(input.endsWith("\n") ? input : input + "\n");
        proc.stdin.end();
      } catch (e) {}
    } else if (proc.stdin) {
      try {
        proc.stdin.end();
      } catch (e) {}
    }

    if (proc.stdout) {
      proc.stdout.on("data", (data) => (stdout += data.toString()));
    }
    if (proc.stderr) {
      proc.stderr.on("data", (data) => (stderr += data.toString()));
    }

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

let dockerAvailableCache = null;
let lastDockerCheckTime = 0;

const isDockerRunning = async () => {
  const now = Date.now();
  if (dockerAvailableCache !== null && now - lastDockerCheckTime < 30000) {
    return dockerAvailableCache;
  }
  lastDockerCheckTime = now;
  try {
    const res = await execDocker(["info"], "", 2000);
    dockerAvailableCache = res.exitCode === 0;
  } catch {
    dockerAvailableCache = false;
  }
  return dockerAvailableCache;
};

const execLocalProcess = async (cmd, args, input = "", timeoutMs = 5000, cwd = undefined) => {
  return new Promise((resolve) => {
    let proc;
    try {
      proc = spawn(cmd, args, { cwd });
    } catch (err) {
      return resolve({ timedOut: false, exitCode: -1, stdout: "", stderr: err.message });
    }

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        if (process.platform === "win32" && proc.pid) {
          spawn("taskkill", ["/pid", proc.pid.toString(), "/f", "/t"]);
        } else {
          proc.kill("SIGKILL");
        }
      } catch (e) {}
    }, timeoutMs);

    if (input && proc.stdin) {
      try {
        proc.stdin.write(input.endsWith("\n") ? input : input + "\n");
        proc.stdin.end();
      } catch (e) {}
    } else if (proc.stdin) {
      try {
        proc.stdin.end();
      } catch (e) {}
    }

    if (proc.stdout) {
      proc.stdout.on("data", (data) => (stdout += data.toString()));
    }
    if (proc.stderr) {
      proc.stderr.on("data", (data) => (stderr += data.toString()));
    }

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

const executeDockerTestCases = async ({
  code,
  language = "javascript",
  testCases = [],
  timeoutMs = 5000,
}) => {
  const runner = RUNNER_CONFIGS[language];
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

    const startRes = await execDocker(startArgs, "", 10000);
    if (startRes.exitCode !== 0) {
      return {
        status: "INTERNAL_ERROR",
        error: "Failed to start execution container",
        testResults: [],
        score: 0
      };
    }

    // Write solution file into container via stdin
    await execDocker(["exec", "-i", containerName, "sh", "-c", `cat > /app/${runner.filename}`], code, 5000);

    // Compile if needed
    if (runner.compile) {
      const compileCmd = runner.compile(containerFilePath);
      const compileArgs = ["exec", containerName, ...compileCmd];
      const compileRes = await execDocker(compileArgs, "", 10000);
      
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
      
      const startTime = Date.now();
      const res = await execDocker(runArgs, "", timeoutMs + 2000);
      const executionTime = Date.now() - startTime;

      let status = "PASSED";
      let error = res.stderr || "";

      if (res.timedOut || executionTime > timeoutMs) {
        status = "TIME_LIMIT_EXCEEDED";
        error = `Execution timed out after ${timeoutMs}ms`;
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

    return {
      status: overallStatus,
      testResults: results,
      score: 0
    };
  } finally {
    await execDocker(["rm", "-f", containerName], "", 5000).catch(() => {});
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
};

const executeLocalTestCases = async ({
  code,
  language = "javascript",
  testCases = [],
  timeoutMs = 5000,
}) => {
  const runner = LOCAL_RUNNER_CONFIGS[language];
  if (!runner) {
    throw new Error(`Unsupported language "${language}"`);
  }

  const executionId = crypto.randomUUID();
  const tempDir = path.join(os.tmpdir(), `code-execution-${executionId}`);
  const codeFile = path.join(tempDir, runner.filename);

  try {
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(codeFile, code, "utf8");

    let exePath = null;

    // 1. Compile if needed
    if (runner.compile) {
      const compileInfo = runner.compile(codeFile, tempDir);
      exePath = compileInfo.exe;
      const compileCmd = compileInfo.cmd[0];
      const compileArgs = compileInfo.cmd.slice(1);

      const compileRes = await execLocalProcess(compileCmd, compileArgs, "", 10000, tempDir);

      if (compileRes.timedOut) {
        return {
          status: "COMPILE_ERROR",
          error: "Compilation timed out after 10000ms",
          testResults: [],
          score: 0,
        };
      }

      if (compileRes.exitCode !== 0) {
        return {
          status: "COMPILE_ERROR",
          error: compileRes.stderr || "Compilation failed",
          testResults: [],
          score: 0,
        };
      }
    }

    // 2. Run test cases
    const results = [];
    let overallStatus = "PASSED";

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const runCmdParts = runner.run(codeFile, tempDir, exePath);
      const cmd = runCmdParts[0];
      const args = runCmdParts.slice(1);

      const startTime = Date.now();
      const res = await execLocalProcess(cmd, args, testCase.input || "", timeoutMs, tempDir);
      const executionTime = Date.now() - startTime;

      let status = "PASSED";
      let error = res.stderr || "";

      if (res.timedOut || executionTime > timeoutMs) {
        status = "TIME_LIMIT_EXCEEDED";
        error = `Execution timed out after ${timeoutMs}ms`;
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
        exitCode: res.exitCode,
      });
    }

    return {
      status: overallStatus,
      testResults: results,
      score: 0,
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
};

const executeAllTestCases = async ({
  code,
  language = "javascript",
  testCases = [],
  timeoutMs = 5000,
}) => {
  const normalizedLang = (language || "").toLowerCase().trim();

  // If Docker daemon is running, execute in Docker container
  const dockerUp = await isDockerRunning();
  if (dockerUp) {
    try {
      const dockerResult = await executeDockerTestCases({
        code,
        language: normalizedLang,
        testCases,
        timeoutMs,
      });
      if (dockerResult.status !== "INTERNAL_ERROR") {
        return dockerResult;
      }
      console.warn("[CodeExecutor] Docker container failed, falling back to local runner");
    } catch (dockerErr) {
      console.warn("[CodeExecutor] Docker execution threw error, falling back to local runner:", dockerErr.message);
    }
  }

  // Fallback to local sandbox runner
  return await executeLocalTestCases({
    code,
    language: normalizedLang,
    testCases,
    timeoutMs,
  });
};

module.exports = {
  executeAllTestCases,
  executeLocalTestCases,
  executeDockerTestCases,
  RUNNER_CONFIGS,
  LOCAL_RUNNER_CONFIGS,
  isDockerRunning,
};