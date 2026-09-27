const request = require('supertest');
const app = require('../../src/app');

describe('Health Check API', () => {
  it('should return 200 OK and status information on GET /health', async () => {
    const response = await request(app).get('/health');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('service', 'programming-lab-backend');
    expect(response.body).toHaveProperty('uptime');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('should return 200 OK on GET / and GET /api/health', async () => {
    const rootRes = await request(app).get('/');
    expect(rootRes.status).toBe(200);
    expect(rootRes.body).toHaveProperty('status', 'ok');

    const apiHealthRes = await request(app).get('/api/health');
    expect(apiHealthRes.status).toBe(200);
    expect(apiHealthRes.body).toHaveProperty('status', 'ok');
  });

  it('should return 200 OK on HEAD / and HEAD /health for cloud load balancers', async () => {
    const headRootRes = await request(app).head('/');
    expect(headRootRes.status).toBe(200);

    const headHealthRes = await request(app).head('/health');
    expect(headHealthRes.status).toBe(200);
  });
});
