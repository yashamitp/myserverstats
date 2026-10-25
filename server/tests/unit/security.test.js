const { encrypt, decrypt, maskSecret } = require('../../src/security/crypto');
const { validateDestination, isRestrictedIPv4 } = require('../../src/security/networkValidator');

describe('Security & SSRF Protection Subsystem', () => {
  describe('AES-256-GCM Encryption', () => {
    it('should encrypt and decrypt string accurately', () => {
      const plaintext = 'super-secret-ssh-private-key-content-12345';
      const encrypted = encrypt(plaintext);

      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.split(':')).toHaveLength(3); // iv:tag:ciphertext

      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should fail decryption if ciphertext or auth tag is tampered with', () => {
      const encrypted = encrypt('my-secret-password');
      const parts = encrypted.split(':');
      // Tamper ciphertext
      parts[2] = parts[2].slice(0, -2) + 'ff';
      const tampered = parts.join(':');

      expect(() => decrypt(tampered)).toThrow();
    });

    it('should mask secrets for display', () => {
      expect(maskSecret('short')).toBe('********');
      expect(maskSecret('very-long-production-token-12345')).toBe('ver...345');
    });
  });

  describe('Outbound Destination & SSRF Protection', () => {
    it('should reject loopback 127.0.0.1 and localhost', async () => {
      const res1 = await validateDestination('127.0.0.1', 22);
      expect(res1.valid).toBe(false);
      expect(res1.error).toContain('Loopback');

      const res2 = await validateDestination('localhost', 22);
      expect(res2.valid).toBe(false);
      expect(res2.error).toContain('Loopback target is prohibited');
    });

    it('should strictly reject AWS/cloud metadata address 169.254.169.254', async () => {
      const res = await validateDestination('169.254.169.254', 22);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('metadata');
    });

    it('should reject link-local 169.254.x.x', async () => {
      const res = await validateDestination('169.254.10.5', 22);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Link-local');
    });

    it('should reject private RFC1918 IPs by default', async () => {
      const res = await validateDestination('192.168.1.100', 22, { allowPrivate: false });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Private network');
    });

    it('should allow private RFC1918 IPs when allowPrivate is explicitly enabled for lab VM testing', async () => {
      const res = await validateDestination('192.168.1.100', 22, { allowPrivate: true });
      expect(res.valid).toBe(true);
      expect(res.resolvedIp).toBe('192.168.1.100');
    });

    it('should reject invalid ports', async () => {
      const res1 = await validateDestination('93.184.216.34', 0);
      expect(res1.valid).toBe(false);

      const res2 = await validateDestination('93.184.216.34', 70000);
      expect(res2.valid).toBe(false);
    });
  });
});
