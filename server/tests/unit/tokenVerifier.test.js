const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { verifyAuthToken } = require('../../src/security/tokenVerifier');

describe('Cryptographic Authentication & Token Verification', () => {
  const localSecret = 'test_local_secret_key_at_least_32_characters_long!';
  let rsaPublicKey;
  let rsaPrivateKey;
  const testClerkDomain = 'clerk.agentops.dev';

  beforeAll(() => {
    const keyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    rsaPublicKey = keyPair.publicKey;
    rsaPrivateKey = keyPair.privateKey;
  });

  describe('Local JWT Verification', () => {
    it('should successfully verify a valid local JWT token', async () => {
      const token = jwt.sign(
        { id: 'user_123', email: 'user@example.com', role: 'user', tenantId: 'tenant_123' },
        localSecret,
        { expiresIn: '1h' }
      );

      const result = await verifyAuthToken(token, { jwtSecret: localSecret });
      expect(result.type).toBe('local');
      expect(result.id).toBe('user_123');
      expect(result.tenantId).toBe('tenant_123');
      expect(result.email).toBe('user@example.com');
    });

    it('should strictly reject a token with an invalid signature', async () => {
      const forgedToken = jwt.sign(
        { id: 'attacker_123', email: 'attacker@evil.com' },
        'wrong_untrusted_secret'
      );

      await expect(
        verifyAuthToken(forgedToken, { jwtSecret: localSecret })
      ).rejects.toThrow();
    });

    it('should strictly reject an expired token', async () => {
      const expiredToken = jwt.sign(
        { id: 'user_123', email: 'user@example.com' },
        localSecret,
        { expiresIn: '-1s' }
      );

      await expect(
        verifyAuthToken(expiredToken, { jwtSecret: localSecret })
      ).rejects.toThrow();
    });

    it('should reject malformed or empty token strings', async () => {
      await expect(verifyAuthToken('')).rejects.toThrow();
      await expect(verifyAuthToken(null)).rejects.toThrow();
      await expect(verifyAuthToken('not.a.valid.jwt.string')).rejects.toThrow();
    });
  });

  describe('Clerk RS256 Cryptographic Verification', () => {
    it('should verify a valid RS256 token matching configured Clerk public key and domain', async () => {
      const validClerkToken = jwt.sign(
        {
          sub: 'user_2clerk_verified_999',
          email: 'clerkuser@example.com',
          name: 'Clerk User',
          iss: `https://${testClerkDomain}`
        },
        rsaPrivateKey,
        {
          algorithm: 'RS256',
          expiresIn: '1h'
        }
      );

      const result = await verifyAuthToken(validClerkToken, {
        jwtSecret: localSecret,
        publicKey: rsaPublicKey,
        clerkDomain: testClerkDomain
      });

      expect(result.type).toBe('clerk');
      expect(result.sub).toBe('user_2clerk_verified_999');
      expect(result.email).toBe('clerkuser@example.com');
    });

    it('should strictly reject a forged Clerk token signed by an untrusted RSA key', async () => {
      const untrustedKeyPair = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });

      const forgedToken = jwt.sign(
        { sub: 'user_forged_attacker', iss: `https://${testClerkDomain}` },
        untrustedKeyPair.privateKey,
        { algorithm: 'RS256', expiresIn: '1h' }
      );

      await expect(
        verifyAuthToken(forgedToken, {
          jwtSecret: localSecret,
          publicKey: rsaPublicKey,
          clerkDomain: testClerkDomain
        })
      ).rejects.toThrow();
    });

    it('should strictly reject a Clerk token from an unexpected/spoofed issuer', async () => {
      const spoofedIssuerToken = jwt.sign(
        { sub: 'user_spoofed', iss: 'https://evil-spoofed-domain.com' },
        rsaPrivateKey,
        { algorithm: 'RS256', expiresIn: '1h' }
      );

      await expect(
        verifyAuthToken(spoofedIssuerToken, {
          jwtSecret: localSecret,
          publicKey: rsaPublicKey,
          clerkDomain: testClerkDomain
        })
      ).rejects.toThrow(/issuer/i);
    });

    it('should strictly reject an expired Clerk token', async () => {
      const expiredClerkToken = jwt.sign(
        { sub: 'user_expired', iss: `https://${testClerkDomain}` },
        rsaPrivateKey,
        { algorithm: 'RS256', expiresIn: '-1s' }
      );

      await expect(
        verifyAuthToken(expiredClerkToken, {
          jwtSecret: localSecret,
          publicKey: rsaPublicKey,
          clerkDomain: testClerkDomain
        })
      ).rejects.toThrow();
    });

    it('should strictly reject unsigned ("alg": "none") tokens', async () => {
      // Craft an unsigned none algorithm token
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ sub: 'user_none_alg', iss: `https://${testClerkDomain}` })).toString('base64url');
      const noneToken = `${header}.${payload}.`;

      await expect(
        verifyAuthToken(noneToken, {
          jwtSecret: localSecret,
          publicKey: rsaPublicKey,
          clerkDomain: testClerkDomain
        })
      ).rejects.toThrow();
    });
  });
});
