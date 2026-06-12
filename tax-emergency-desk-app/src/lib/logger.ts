import pino from 'pino';
import { env } from '@/config/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'password',
      'passwordHash',
      '*.password',
      '*.passwordHash',
      '*.taxpayerNpwpEncrypted',
      '*.taxpayer_npwp_encrypted',
      '*.rawText',
      '*.prompt',
      '*.documentText'
    ],
    remove: true
  }
});
