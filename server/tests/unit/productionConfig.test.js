const { validateConfig } = require('../../src/config/env');

describe('Production Configuration & Startup Safeguards', () => {
  it('should fail startup in production when JWT_SECRET is missing', () => {
    expect(() => {
      validateConfig({
        NODE_ENV: 'production',
        ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcde0',
        MONGODB_URI: 'mongodb://localhost:27017/prod'
      });
    }).toThrow(/JWT_SECRET must be explicitly configured/i);
  });

  it('should fail startup in production when JWT_SECRET is a known dev placeholder', () => {
    expect(() => {
      validateConfig({
        NODE_ENV: 'production',
        JWT_SECRET: 'dev_secret_key_agentops_super_secure_32bytes!',
        ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcde0',
        MONGODB_URI: 'mongodb://localhost:27017/prod'
      });
    }).toThrow(/cannot use development placeholder defaults/i);
  });

  it('should fail startup in production when ENCRYPTION_KEY is missing', () => {
    expect(() => {
      validateConfig({
        NODE_ENV: 'production',
        JWT_SECRET: 'a_very_strong_production_secret_key_123456789!',
        MONGODB_URI: 'mongodb://localhost:27017/prod'
      });
    }).toThrow(/ENCRYPTION_KEY must be explicitly configured/i);
  });

  it('should fail startup in production when ENCRYPTION_KEY is not a valid 64-hex string', () => {
    expect(() => {
      validateConfig({
        NODE_ENV: 'production',
        JWT_SECRET: 'a_very_strong_production_secret_key_123456789!',
        ENCRYPTION_KEY: 'not_a_hex_key_too_short',
        MONGODB_URI: 'mongodb://localhost:27017/prod'
      });
    }).toThrow(/64-character hex string/i);
  });

  it('should fail startup in production when MONGODB_URI is missing', () => {
    expect(() => {
      validateConfig({
        NODE_ENV: 'production',
        JWT_SECRET: 'a_very_strong_production_secret_key_123456789!',
        ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcde0'
      });
    }).toThrow(/MONGODB_URI is required and must be a valid persistent MongoDB/i);
  });

  it('should pass validation in production when all production settings are properly configured', () => {
    expect(() => {
      validateConfig({
        NODE_ENV: 'production',
        JWT_SECRET: 'a_very_strong_production_secret_key_123456789!',
        ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcde0',
        MONGODB_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/prod'
      });
    }).not.toThrow();
  });

  it('should allow clean startup in development mode with dev fallbacks', () => {
    expect(() => {
      validateConfig({
        NODE_ENV: 'development'
      });
    }).not.toThrow();
  });
});
