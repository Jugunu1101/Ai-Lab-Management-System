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