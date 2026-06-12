import { createCipheriv, randomBytes } from 'node:crypto';
import { env } from '@/config/env';

type EncryptedDocument = {
  buffer: Buffer;
  metadata: {
    encrypted: boolean;
    algorithm?: 'aes-256-gcm';
    envelope?: 'iv.authTag.ciphertext';
  };
};

export function encryptDocumentBuffer(buffer: Buffer): EncryptedDocument {
  if (!env.DOCUMENT_ENCRYPTION_KEY_BASE64) return { buffer, metadata: { encrypted: false } };

  const key = Buffer.from(env.DOCUMENT_ENCRYPTION_KEY_BASE64, 'base64');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    buffer: Buffer.concat([iv, authTag, ciphertext]),
    metadata: {
      encrypted: true,
      algorithm: 'aes-256-gcm',
      envelope: 'iv.authTag.ciphertext'
    }
  };
}
