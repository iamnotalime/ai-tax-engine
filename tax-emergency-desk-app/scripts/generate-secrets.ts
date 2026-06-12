import { randomBytes } from 'node:crypto';

function secret(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

function base64Key(bytes = 32) {
  return randomBytes(bytes).toString('base64');
}

console.log([
  '# Generated production secrets. Store these in your secret manager, not in git.',
  `AUTH_SECRET=${secret(48)}`,
  `INTERNAL_JOB_TOKEN=${secret(48)}`,
  `METRICS_TOKEN=${secret(48)}`,
  `DOCUMENT_ENCRYPTION_KEY_BASE64=${base64Key(32)}`
].join('\n'));
