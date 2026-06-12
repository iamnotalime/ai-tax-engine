import { createHash } from 'node:crypto';

export function sha256(input: Buffer | string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function normalizeIdentifier(value: string): string {
  return value.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}

export function stableHashSensitive(value: string): string {
  return sha256(normalizeIdentifier(value));
}
