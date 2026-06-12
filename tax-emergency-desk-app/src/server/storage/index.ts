import { env } from '@/config/env';
import { LocalStorageAdapter } from './local';
import { S3StorageAdapter } from './s3';
import type { StorageAdapter } from './types';

let adapter: StorageAdapter | null = null;

export function getStorageAdapter() {
  adapter ??= env.STORAGE_DRIVER === 's3' ? new S3StorageAdapter() : new LocalStorageAdapter();
  return adapter;
}
