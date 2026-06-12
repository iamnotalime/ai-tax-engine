import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { env } from '@/config/env';

export function sha256(input: Buffer | string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function normalizeIdentifier(value: string): string {
  return value.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}

export function stableHashSensitive(value: string): string {
  return sha256(normalizeIdentifier(value));
}

export function encryptSensitiveString(value: string): Buffer | null {
  if (!env.DOCUMENT_ENCRYPTION_KEY_BASE64) return null;

  const key = Buffer.from(env.DOCUMENT_ENCRYPTION_KEY_BASE64, 'base64');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]);
}
