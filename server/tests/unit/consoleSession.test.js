const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Server = require('../../src/models/Server');
const consoleSessionManager = require('../../src/services/consoleSessionManager');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Server.deleteMany({});
  consoleSessionManager.sessions.clear();
});

describe('Web Console Session Security & Lifecycle', () => {
  const tenantAlice = 'tenant_alice';
  const tenantBob = 'tenant_bob';

  it('should strictly reject session creation if server belongs to a different tenant', async () => {
    // Alice owns this server
    const aliceServer = await Server.create({
      tenantId: tenantAlice,
      name: 'Alice-DB-01',
      hostname: '192.0.2.1',
      authMethod: 'password',
      credentials: { encryptedPassword: 'dummy' }
    });

    const mockSocket = { id: 'sock_123', emit: jest.fn() };

    // Bob attempts to open console on Alice's server
    await expect(
      consoleSessionManager.createSession({
        serverId: aliceServer._id.toString(),
        tenantId: tenantBob,
        userId: 'bob_user',
        socket: mockSocket
      })
    ).rejects.toThrow(/Server not found or access denied/i);
  });

  it('should reject session creation when server has no configured credentials', async () => {
    const serverWithoutCreds = await Server.create({
      tenantId: tenantAlice,
      name: 'Unconfigured-Host',
      hostname: '192.0.2.2',
      authMethod: 'password'
    });

    const mockSocket = { id: 'sock_124', emit: jest.fn() };

    await expect(
      consoleSessionManager.createSession({
        serverId: serverWithoutCreds._id.toString(),
        tenantId: tenantAlice,
        userId: 'alice_user',
        socket: mockSocket
      })
    ).rejects.toThrow(/No valid authentication credentials configured/i);
  });

  it('should enforce concurrency limit per server', async () => {
    const server = await Server.create({
      tenantId: tenantAlice,
      name: 'Loaded-Host',
      hostname: '192.0.2.3',
      authMethod: 'password',
      credentials: { encryptedPassword: 'dummy' }
    });

    // Populate active sessions up to limit
    const serverIdStr = server._id.toString();
    consoleSessionManager.sessions.set('sess_1', { serverId: serverIdStr, tenantId: tenantAlice });
    consoleSessionManager.sessions.set('sess_2', { serverId: serverIdStr, tenantId: tenantAlice });
    consoleSessionManager.sessions.set('sess_3', { serverId: serverIdStr, tenantId: tenantAlice });

    const mockSocket = { id: 'sock_125', emit: jest.fn() };

    await expect(
      consoleSessionManager.createSession({
        serverId: serverIdStr,
        tenantId: tenantAlice,
        userId: 'alice_user',
        socket: mockSocket
      })
    ).rejects.toThrow(/Maximum concurrent console sessions reached/i);
  });
});
