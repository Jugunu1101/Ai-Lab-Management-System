const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000/api';
const JWT_SECRET = process.env.JWT_SECRET;
const teacherId = '6ab6b782c6c2542b8ecf191b';
const token = jwt.sign({ userId: teacherId, role: 'TEACHER', email: 'ji@mit.edu' }, JWT_SECRET, { expiresIn: '1d' });

async function testGenerate() {
  const cPlusPlusId = '6ab7fb35ab3e73a6ee61ef04';
  const startDate = '2026-09-20T00:00:00.000Z';
  const endDate = '2026-09-27T23:59:59.999Z';

  try {
    const res = await axios.post(
      `${BASE_URL}/reports/weekly/${cPlusPlusId}/generate`,
      { startDate, endDate },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Result for c++ class:');
    console.log('Statistics:', res.data.data?.statistics);
    console.log('Summary:', res.data.data?.summary);
    console.log('Vulnerable Concepts:', res.data.data?.vulnerableConcepts);
    console.log('Strong Concepts:', res.data.data?.strongConcepts);
    console.log('Students Needing Intervention:', res.data.data?.studentsNeedingIntervention);
  } catch (err) {
    console.error('Error generating for c++:', err.response?.data || err.message);
  }
}
testGenerate();
