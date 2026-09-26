const crypto = require("crypto");

const SENSITIVE_FIELDS = ["password", "token", "newPassword", "oldPassword", "secret"];

function sanitizeData(data) {
  if (!data || typeof data !== "object") return data;
  if (Array.isArray(data)) return data.map(sanitizeData);

  const sanitized = { ...data };
  for (const key of Object.keys(sanitized)) {
    if (SENSITIVE_FIELDS.includes(key)) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof sanitized[key] === "object") {
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  }
  return sanitized;
}

const requestLogger = (req, res, next) => {
  const requestId = req.headers["x-request-id"] || crypto.randomUUID();
  req.id = requestId;
  res.setHeader("X-Request-Id", requestId);

  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const logData = {
      requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs: duration,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers["user-agent"],
      timestamp: new Date().toISOString(),
    };

    if (process.env.NODE_ENV !== "test") {
      const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
      if (level === "error") {
        console.error(JSON.stringify({ level, ...logData }));
      } else if (level === "warn") {
        console.warn(JSON.stringify({ level, ...logData }));
      } else {
        console.log(JSON.stringify({ level, ...logData }));
      }
    }
  });

  next();
};

module.exports = {
  requestLogger,
  sanitizeData,
};
