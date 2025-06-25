import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Encrypts a token using AES-256-GCM
 * @param raw - The raw token to encrypt
 * @returns The encrypted token as a hex string
 */
export function encryptToken(raw: string): string {
  const vaultKey = process.env.VAULT_KEY;
  
  if (!vaultKey) {
    throw new Error('VAULT_KEY environment variable is required');
  }
  
  if (vaultKey.length !== 64) {
    throw new Error('VAULT_KEY must be 32 bytes (64 hex characters)');
  }

  try {
    // Convert hex key to buffer
    const key = Buffer.from(vaultKey, 'hex');
    
    // Generate random IV
    const iv = randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = createCipheriv(ALGORITHM, key, iv);
    cipher.setAAD(Buffer.from('gioat-vault', 'utf8'));
    
    // Encrypt the data
    let encrypted = cipher.update(raw, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get the auth tag
    const tag = cipher.getAuthTag();
    
    // Combine IV + tag + encrypted data
    const result = iv.toString('hex') + tag.toString('hex') + encrypted;
    
    return result;
  } catch (error) {
    throw new Error(`Encryption failed: ${(error as Error).message}`);
  }
}

/**
 * Decrypts a token using AES-256-GCM
 * @param enc - The encrypted token as a hex string
 * @returns The decrypted token
 */
export function decryptToken(enc: string): string {
  const vaultKey = process.env.VAULT_KEY;
  
  if (!vaultKey) {
    throw new Error('VAULT_KEY environment variable is required');
  }
  
  if (vaultKey.length !== 64) {
    throw new Error('VAULT_KEY must be 32 bytes (64 hex characters)');
  }

  try {
    // Convert hex key to buffer
    const key = Buffer.from(vaultKey, 'hex');
    
    // Extract IV, tag, and encrypted data
    const iv = Buffer.from(enc.substring(0, IV_LENGTH * 2), 'hex');
    const tag = Buffer.from(enc.substring(IV_LENGTH * 2, (IV_LENGTH + TAG_LENGTH) * 2), 'hex');
    const encrypted = enc.substring((IV_LENGTH + TAG_LENGTH) * 2);
    
    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAAD(Buffer.from('gioat-vault', 'utf8'));
    decipher.setAuthTag(tag);
    
    // Decrypt the data
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${(error as Error).message}`);
  }
}

export class SecretsVault {
  async encrypt(value: string): Promise<string> {
    // TODO: Implement real encryption
    return value;
  }
  async decrypt(value: string): Promise<string> {
    // TODO: Implement real decryption
    return value;
  }
} 