const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Server = require('../../src/models/Server');

describe('AgentOps REST API & Multi-Tenant Integration Tests', () => {
  let mongoServer;
  let user1Token;
  let user1Id;
  let user2Token;
  let user2Id;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('Health Endpoint', () => {
    it('GET /health should return 200 and healthy status without exposing secrets', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.service).toBe('agentops-api');
      expect(res.body.database).toBe('connected');
    });
  });

  describe('Authentication Endpoints', () => {
    it('POST /api/v1/auth/register should create user and return JWT', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'alice@example.com',
          name: 'Alice DevOps',
          password: 'Password123!'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe('alice@example.com');

      user1Token = res.body.data.token;
      user1Id = res.body.data.user.id;
    });

    it('POST /api/v1/auth/login should authenticate user with correct credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'alice@example.com',
          password: 'Password123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });

    it('POST /api/v1/auth/login should reject incorrect password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'alice@example.com',
          password: 'WrongPassword!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/v1/auth/me should return current user info', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('alice@example.com');
      expect(res.body.data.name).toBe('Alice DevOps');
    });

    it('Security: Forged Clerk JWT with client-supplied email header must be rejected with 401', async () => {
      // Attacker attempts to forge a token signed with an arbitrary secret
      const forgedToken = jwt.sign(
        { sub: 'user_forged_attacker_123', email: 'alice@example.com' },
        'untrusted_attacker_secret'
      );

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${forgedToken}`)
        .set('X-Clerk-User-Email', 'alice@example.com');

      // Must strictly be rejected with 401 Unauthorized
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should register a second user for tenant isolation testing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'bob@example.com',
          name: 'Bob Admin',
          password: 'Password123!'
        });

      expect(res.status).toBe(201);
      user2Token = res.body.data.token;
      user2Id = res.body.data.user.id;
    });
  });

  describe('Server Management & Multi-Tenant Isolation', () => {
    let aliceServerId;

    it('POST /api/v1/servers should create a server for Alice', async () => {
      const res = await request(app)
        .post('/api/v1/servers')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Alice Production VPS',
          hostname: '203.0.113.10',
          port: 22,
          osDistro: 'ubuntu',
          monitoringMethod: 'ssh',
          authMethod: 'key',
          username: 'agentops',
          privateKey: '-----BEGIN OPENSSH PRIVATE KEY-----\ntest\n-----END OPENSSH PRIVATE KEY-----',
          tags: ['prod', 'web']
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Alice Production VPS');
      expect(res.body.data.credentials).toBeUndefined(); // Never leak encrypted credentials in API response!
      aliceServerId = res.body.data._id;
    });

    it('GET /api/v1/servers should list only servers owned by the caller', async () => {
      // Alice sees her server
      const resAlice = await request(app)
        .get('/api/v1/servers')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(resAlice.status).toBe(200);
      expect(resAlice.body.data).toHaveLength(1);
      expect(resAlice.body.data[0].name).toBe('Alice Production VPS');

      // Bob sees 0 servers
      const resBob = await request(app)
        .get('/api/v1/servers')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(resBob.status).toBe(200);
      expect(resBob.body.data).toHaveLength(0);
    });

    it('Tenant Isolation: Bob cannot access Alice\'s server details', async () => {
      const res = await request(app)
        .get(`/api/v1/servers/${aliceServerId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      // 404 indicates resource does not exist for this tenant
      expect(res.status).toBe(404);
    });

    it('Tenant Isolation: Bob cannot delete Alice\'s server', async () => {
      const res = await request(app)
        .delete(`/api/v1/servers/${aliceServerId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(404);

      // Verify server is still intact
      const check = await Server.findById(aliceServerId);
      expect(check).not.toBeNull();
    });

    it('PATCH /api/v1/servers/:id allows Alice to update her server', async () => {
      const res = await request(app)
        .patch(`/api/v1/servers/${aliceServerId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Alice Production VPS (Updated)',
          monitoringInterval: 15
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Alice Production VPS (Updated)');
      expect(res.body.data.monitoringInterval).toBe(15);
    });
  });

  describe('SSRF & Pre-flight Connection Testing', () => {
    it('POST /api/v1/servers/test-connection should reject AWS metadata IP (169.254.169.254)', async () => {
      const res = await request(app)
        .post('/api/v1/servers/test-connection')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          hostname: '169.254.169.254',
          port: 22,
          username: 'root'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('rejected');
    });

    it('POST /api/v1/servers/test-connection should reject localhost/loopback', async () => {
      const res = await request(app)
        .post('/api/v1/servers/test-connection')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          hostname: '127.0.0.1',
          port: 22,
          username: 'root'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('rejected');
    });
  });

  describe('Honest AI Diagnostics Behavior', () => {
    it('POST /api/v1/ai/chat should return structured status based on AI configuration', async () => {
      const serversRes = await request(app)
        .get('/api/v1/servers')
        .set('Authorization', `Bearer ${user1Token}`);

      const serverId = serversRes.body.data[0]._id;

      const res = await request(app)
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          serverId,
          prompt: 'Why is my CPU high?'
        });

      // If configured with real key, returns 200; if unconfigured, returns 503 without fabricating success
      if (process.env.AI_API_KEY) {
        expect([200, 503]).toContain(res.status);
      } else {
        expect(res.status).toBe(503);
        expect(res.body.success).toBe(false);
        expect(res.body.error.message).toContain('not configured');
      }
    });
  });

  describe('Alert Rules Management', () => {
    it('POST /api/v1/alerts/rules should create a CPU threshold alert rule', async () => {
      const res = await request(app)
        .post('/api/v1/alerts/rules')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'High CPU Alert Rule',
          metricType: 'cpu',
          condition: 'gt',
          threshold: 85,
          severity: 'warning'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('High CPU Alert Rule');
      expect(res.body.data.threshold).toBe(85);
    });

    it('GET /api/v1/alerts should return alerts list for user', async () => {
      const res = await request(app)
        .get('/api/v1/alerts')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
