const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");

const RUNNER_CONFIGS = {
  javascript: {
    image: "node:22-alpine",
    filename: "main.js",
    command: (containerFilePath) => ["node", containerFilePath],
  },
  python: {
    image: "python:3.11-alpine",
    filename: "solution.py",
    command: (containerFilePath) => ["python", containerFilePath],
  },
  cpp: {
    image: "gcc:alpine",
    filename: "solution.cpp",
    command: (containerFilePath) => [
      "sh",
      "-c",
      `g++ -O2 ${containerFilePath} -o /tmp/solution && /tmp/solution`,
    ],
  },
  java: {
    image: "eclipse-temurin:21-alpine",
    filename: "Solution.java",
    command: (containerFilePath) => [
      "sh",
      "-c",
      `javac ${containerFilePath} -d /tmp && java -cp /tmp Solution`,
    ],
  },
};

const executeCode = async ({
  code,
  language = "javascript",
  input = "",
  timeoutMs = 5000,
}) => {
  const normalizedLang = (language || "").toLowerCase().trim();
  const runner = RUNNER_CONFIGS[normalizedLang];

  if (!runner) {
    const supported = Object.keys(RUNNER_CONFIGS).join(", ");
    throw new Error(
      `Unsupported language "${language}". Supported languages are: ${supported}`
    );
  }

  const executionId = crypto.randomUUID();
  const tempDir = path.join(os.tmpdir(), `code-execution-${executionId}`);
  const codeFile = path.join(tempDir, runner.filename);
  const containerFilePath = `/app/${runner.filename}`;

  try {
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(codeFile, code, "utf8");

    const dockerArgs = [
      "run",
      "--rm",
      "-i",
      "--network",
      "none",
      "--memory",
      "128m",
      "--cpus",
      "0.5",
      "--pids-limit",
      "64",
      "--read-only",
      "--tmpfs",
      "/tmp:rw,nosuid,size=64m",
      "-v",
      `${tempDir}:/app:ro`,
      runner.image,
      ...runner.command(containerFilePath),
    ];

    return await new Promise((resolve) => {
      let dockerProcess;
      try {
        dockerProcess = spawn("docker", dockerArgs);
      } catch (spawnError) {
        return resolve({
          status: "ERROR",
          stdout: "",
          stderr: `Failed to spawn docker process: ${spawnError.message}`,
          exitCode: -1,
        });
      }

      let stdout = "";
      let stderr = "";
      let timedOut = false;

      if (input) {
        dockerProcess.stdin.write(input);
      }
      dockerProcess.stdin.end();

      dockerProcess.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      dockerProcess.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      const timeout = setTimeout(() => {
        timedOut = true;
        dockerProcess.kill("SIGKILL");
      }, timeoutMs);

      dockerProcess.on("error", (error) => {
        clearTimeout(timeout);
        resolve({
          status: "ERROR",
          stdout,
          stderr: `Docker execution error: ${error.message}`,
          exitCode: -1,
        });
      });

      dockerProcess.on("close", (exitCode) => {
        clearTimeout(timeout);

        if (timedOut) {
          return resolve({
            status: "TIMEOUT",
            stdout,
            stderr: "Execution timed out",
            exitCode: null,
          });
        }

        resolve({
          status: exitCode === 0 ? "COMPLETED" : "FAILED",
          stdout,
          stderr,
          exitCode,
        });
      });
    });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
};

const executeJavaScript = async (params) => {
  return executeCode({ ...params, language: "javascript" });
};

module.exports = {
  executeCode,
  executeJavaScript,
  RUNNER_CONFIGS,
};