const request = require('supertest');
const app = require('../../src/app');

describe('Health Check API', () => {
  it('should return 200 OK and status information', async () => {
    const response = await request(app).get('/health');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('service', 'programming-lab-backend');
    expect(response.body).toHaveProperty('uptime');
    expect(response.body).toHaveProperty('timestamp');
  });
});
