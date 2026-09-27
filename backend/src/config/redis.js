const IORedis = require("ioredis");

let connection = null;

const getRedisOptions = () => {
  const options = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    showFriendlyErrorStack: false,
    retryStrategy: (times) => {
      if (times > 3) return null;
      return Math.min(times * 1000, 3000);
    },
  };
  if (process.env.REDIS_PASSWORD) {
    options.password = process.env.REDIS_PASSWORD;
  }
  return options;
};

const getRedisConnection = () => {
  if (connection) {
    return connection;
  }

  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  connection = new IORedis(redisUrl, getRedisOptions());

  connection.on("connect", () => {
    console.log("Redis connected.");
  });

  connection.on("error", (error) => {
    // Handled to prevent unhandled node event errors
  });

  return connection;
};

const createRedisConnection = () => {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  const workerConn = new IORedis(redisUrl, getRedisOptions());

  workerConn.on("error", (error) => {
    // Handled to prevent unhandled node event errors
  });

  return workerConn;
};

const checkRedisAvailability = async () => {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  const probe = new IORedis(redisUrl, {
    connectTimeout: 2000,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
    lazyConnect: true,
    enableOfflineQueue: false,
    showFriendlyErrorStack: false,
  });

  // Attach error handler BEFORE connecting to prevent unhandled 'error' event emissions
  probe.on("error", () => {
    // Handled gracefully for availability probes
  });

  try {
    await probe.connect();
    await probe.ping();
    await probe.quit();
    return true;
  } catch (err) {
    try {
      probe.disconnect();
    } catch (_) {}
    return false;
  }
};

module.exports = {
  getRedisConnection,
  createRedisConnection,
  checkRedisAvailability,
};
