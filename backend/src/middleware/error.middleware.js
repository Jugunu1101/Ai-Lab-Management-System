const errorHandler = (err, req, res, next) => {
  if (process.env.NODE_ENV !== "test") {
    console.error(`[Error] RequestID: ${req?.id || "N/A"} - ${err.message}`, err);
  }

  let statusCode = err.statusCode || 500;
  let code = err.code || "INTERNAL_SERVER_ERROR";
  let message = err.message || "Something went wrong";
  let details = err.details || undefined;

  // Invalid MongoDB ObjectId
  if (err.name === "CastError") {
    statusCode = 400;
    code = "INVALID_ID";
    message = `Invalid ${err.path}`;
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = Object.values(err.errors)
      .map((error) => error.message)
      .join(", ");
  }

  // Duplicate MongoDB key
  if (err.code === 11000) {
    statusCode = 409;
    code = "DUPLICATE_RESOURCE";
    message = "A resource with this value already exists";
  }

  // MongoDB Atlas / Local MongoDB Connection & Network Errors
  const isDbConnectionError =
    err.name === "MongoServerSelectionError" ||
    err.name === "MongoNetworkError" ||
    err.name === "MongoTimeoutError" ||
    err.name === "MongoNotConnectedError" ||
    err.name === "MongoTopologyClosedError" ||
    err.name === "MongooseServerSelectionError" ||
    (err.name === "MongooseError" && typeof err.message === "string" && err.message.includes("buffering timed out")) ||
    (typeof err.message === "string" &&
      (err.message.includes("ENOTFOUND") ||
        err.message.includes("mongodb.net") ||
        err.message.includes("Client must be connected") ||
        err.message.includes("topology was destroyed") ||
        err.message.includes("ECONNREFUSED 127.0.0.1:27017") ||
        err.message.includes("ECONNREFUSED localhost:27017") ||
        err.message.includes("connect ECONNREFUSED")));


  if (isDbConnectionError) {
    statusCode = 503;
    code = "DATABASE_UNAVAILABLE";
    message = "Database is unavailable. Please start the local database or check your connection.";
    details = undefined;
  }

  // Code execution service unavailable
  if (err.code === "CODE_EXECUTION_UNAVAILABLE") {
    statusCode = 503;
    code = "CODE_EXECUTION_UNAVAILABLE";
    message = "Code execution service is unavailable. Please make sure the execution service is running.";
    details = undefined;
  }

  // AI Service unavailable
  if (err.code === "AI_SERVICE_UNAVAILABLE") {
    statusCode = 503;
    code = "AI_SERVICE_UNAVAILABLE";
    message = "AI service is currently unavailable. Please verify the AI service is running or switch to mock mode.";
    details = undefined;
  }

  // Final safeguard: prevent any raw hostnames, passwords, or connection strings from leaking
  if (
    typeof message === "string" &&
    (message.includes("mongodb.net") ||
      message.includes("mongodb+srv://") ||
      message.includes("getaddrinfo ENOTFOUND") ||
      message.includes("passwordHash"))
  ) {
    message = "Database is unavailable. Please start the local database or check your connection.";
    code = "DATABASE_UNAVAILABLE";
    statusCode = 503;
    details = undefined;
  }

  const responsePayload = {
    success: false,
    error: {
      code,
      message,
      ...(req?.id && { requestId: req.id }),
      ...(details && { details }),
    },
  };

  return res.status(statusCode).json(responsePayload);
};

module.exports = errorHandler;