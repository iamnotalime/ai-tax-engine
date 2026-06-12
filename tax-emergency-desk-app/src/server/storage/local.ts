import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '@/config/env';
import type { StorageAdapter, StoredObjectInput } from './types';

function resolveStoragePath(key: string) {
  const root = path.resolve(env.LOCAL_STORAGE_ROOT);
  const target = path.resolve(root, key);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    throw new Error('Storage key escapes local storage root.');
  }
  return target;
}

export class LocalStorageAdapter implements StorageAdapter {
  readonly driver = 'local' as const;

  async putObject(input: StoredObjectInput) {
    const absolutePath = resolveStoragePath(input.key);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, input.buffer);
  }

  async deleteObject(key: string) {
    const absolutePath = resolveStoragePath(key);
    await unlink(absolutePath).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
}
