const mongoose = require('mongoose');
const uri = 'mongodb+srv://project:ofjYMCq7kn7EFg4X@project.8lpp7ls.mongodb.net/';

async function inspectAtlas() {
  console.log('Connecting to Atlas...');
  await mongoose.connect(uri, { dbName: 'ai-lab' });
  const db = mongoose.connection.db;
  console.log('Current DB name:', db.databaseName);

  const collections = await db.listCollections().toArray();
  console.log('\n--- Collections in ai-lab ---');
  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments();
    console.log(`Collection: ${col.name} -> ${count} documents`);
  }

  // Check if there are other databases in cluster
  const adminDb = db.admin();
  const dbs = await adminDb.listDatabases();
  console.log('\n--- Databases in Atlas Cluster ---');
  for (const d of dbs.databases) {
    console.log(`Database: ${d.name} (size: ${d.sizeOnDisk} bytes)`);
  }

  await mongoose.disconnect();
}

inspectAtlas().catch(console.error);
