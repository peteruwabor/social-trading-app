import { encryptToken, decryptToken } from '../../api/src/lib/secrets-vault';

describe('SecretsVault', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Set up test environment
    process.env = {
      ...originalEnv,
      VAULT_KEY: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('encryptToken', () => {
    it('should encrypt a token successfully', () => {
      const token = 'test-token-123';
      const encrypted = encryptToken(token);
      
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe(token);
      expect(encrypted.length).toBeGreaterThan(token.length);
    });

    it('should throw error when VAULT_KEY is missing', () => {
      const originalKey = process.env.VAULT_KEY;
      delete process.env.VAULT_KEY;
      
      expect(() => {
        encryptToken('test-token');
      }).toThrow('VAULT_KEY environment variable is required');
      
      process.env.VAULT_KEY = originalKey;
    });

    it('should throw error when VAULT_KEY is wrong length', () => {
      const originalKey = process.env.VAULT_KEY;
      process.env.VAULT_KEY = 'short';
      
      expect(() => {
        encryptToken('test-token');
      }).toThrow('VAULT_KEY must be 32 bytes (64 hex characters)');
      
      process.env.VAULT_KEY = originalKey;
    });

    it('should throw error when VAULT_KEY is invalid hex', () => {
      const originalKey = process.env.VAULT_KEY;
      process.env.VAULT_KEY = 'invalid-hex-string-that-is-64-characters-long-but-not-valid-hex-format';
      
      expect(() => {
        encryptToken('test-token');
      }).toThrow('VAULT_KEY must be 32 bytes (64 hex characters)');
      
      process.env.VAULT_KEY = originalKey;
    });
  });

  describe('decryptToken', () => {
    it('should decrypt an encrypted token successfully', () => {
      const rawToken = 'test-access-token-12345';
      const encrypted = encryptToken(rawToken);
      const decrypted = decryptToken(encrypted);
      
      expect(decrypted).toBe(rawToken);
    });

    it('should handle special characters in tokens', () => {
      const rawToken = 'test-token-with-special-chars!@#$%^&*()_+-=[]{}|;:,.<>?';
      const encrypted = encryptToken(rawToken);
      const decrypted = decryptToken(encrypted);
      
      expect(decrypted).toBe(rawToken);
    });

    it('should handle empty tokens', () => {
      const rawToken = '';
      const encrypted = encryptToken(rawToken);
      const decrypted = decryptToken(encrypted);
      
      expect(decrypted).toBe(rawToken);
    });

    it('should handle long tokens', () => {
      const rawToken = 'a'.repeat(1000);
      const encrypted = encryptToken(rawToken);
      const decrypted = decryptToken(encrypted);
      
      expect(decrypted).toBe(rawToken);
    });

    it('should throw error when VAULT_KEY is missing', () => {
      delete process.env.VAULT_KEY;
      
      expect(() => {
        decryptToken('some-encrypted-data');
      }).toThrow('VAULT_KEY environment variable is required');
    });

    it('should throw error when VAULT_KEY is wrong length', () => {
      process.env.VAULT_KEY = 'short-key';
      
      expect(() => {
        decryptToken('some-encrypted-data');
      }).toThrow('VAULT_KEY must be 32 bytes (64 hex characters)');
    });

    it('should throw error when encrypted data is malformed', () => {
      expect(() => {
        decryptToken('invalid-encrypted-data');
      }).toThrow('Decryption failed');
    });

    it('should throw error when encrypted data is too short', () => {
      expect(() => {
        decryptToken('short');
      }).toThrow('Decryption failed');
    });
  });

  describe('round-trip encryption', () => {
    it('should successfully encrypt and decrypt various token types', () => {
      const testTokens = [
        'simple-token',
        'token-with-numbers-12345',
        'token-with-symbols!@#$%^&*()',
        'token-with-spaces and tabs',
        'token-with-unicode-🎉🚀💻',
        'very-long-token-' + 'a'.repeat(500),
        '', // empty token
      ];

      testTokens.forEach(token => {
        const encrypted = encryptToken(token);
        const decrypted = decryptToken(encrypted);
        
        expect(decrypted).toBe(token);
      });
    });

    it('should produce different encrypted outputs for same input', () => {
      const rawToken = 'test-token';
      const encrypted1 = encryptToken(rawToken);
      const encrypted2 = encryptToken(rawToken);
      
      // Should be different due to random IV
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to the same value
      expect(decryptToken(encrypted1)).toBe(rawToken);
      expect(decryptToken(encrypted2)).toBe(rawToken);
    });
  });
}); 