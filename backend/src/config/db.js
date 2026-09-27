const mongoose = require('mongoose');

let isConnecting = false;
let reconnectTimer = null;

// Connection event listeners
mongoose.connection.on('connected', () => {
  console.log(`[MongoDB] Connected successfully to database: ${mongoose.connection.name}`);
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
});

mongoose.connection.on('error', (err) => {
  console.error(`[MongoDB] Runtime connection error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  if (process.env.NODE_ENV === 'test') return;
  console.warn('[MongoDB] Disconnected from database. Scheduling reconnect in 3s...');
  scheduleReconnect();
});

function scheduleReconnect() {
  if (isConnecting || reconnectTimer) return;
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    if (mongoose.connection.readyState !== 1) {
      console.log('[MongoDB] Retrying connection...');
      await connectDB();
    }
  }, 3000);
}

async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  if (isConnecting) return;

  let uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-lab';
  const dbName = process.env.MONGODB_DB_NAME || 'ai-lab';

  // Normalize URI to ensure target database name is included
  if (uri.includes('mongodb+srv://') || uri.includes('mongodb://')) {
    if (uri.endsWith('/test') || uri.includes('/test?')) {
      uri = uri.replace(/\/test(\?|$)/, `/${dbName}$1`);
    } else if (uri.endsWith('/')) {
      uri = `${uri}${dbName}`;
    }
  }

  try {
    isConnecting = true;
    const isSrv = uri.startsWith('mongodb+srv://');
    console.log(`[MongoDB] Attempting connection to ${isSrv ? 'MongoDB Atlas (Remote)' : 'Local MongoDB'} (Target DB: ${dbName})...`);

    await mongoose.connect(uri, {
      dbName,
      minPoolSize: 2,
      maxPoolSize: 50,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });

    try {
      const { seedDefaultColleges } = require("./seedColleges");
      await seedDefaultColleges();
    } catch (seedErr) {
      console.warn('[MongoDB] Seed colleges warning:', seedErr.message);
    }
  } catch (error) {
    console.error(`[MongoDB] Connection failed: ${error.message}`);
    console.warn('[MongoDB] Application running in offline/degraded mode. Retrying connection in 5s...');
    scheduleReconnect();
  } finally {
    isConnecting = false;
  }
}

const isDBConnected = () => {
  return mongoose.connection.readyState === 1;
};

connectDB.connectDB = connectDB;
connectDB.isDBConnected = isDBConnected;

module.exports = connectDB;
