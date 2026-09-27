const mongoose = require('mongoose');
require('dotenv').config();

async function fixDB() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'ai-lab' });
  const Assignment = mongoose.model('Assignment', new mongoose.Schema({
    title: String,
    problemStatement: String
  }));

  const res = await Assignment.updateMany(
    { title: /Nested Number Triangle Pattern/i, problemStatement: /right-aligned/i },
    { $set: { problemStatement: 'Given an integer N, generate a right-angled numerical triangle of height N where row i contains numbers 1 through i separated by a space.' } }
  );
  console.log('Updated assignments in DB:', res.modifiedCount);
  await mongoose.disconnect();
}
fixDB().catch(console.error);
