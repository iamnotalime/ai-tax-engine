import { access } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const databaseUrl = process.env.DATABASE_URL;
const backupPath = process.argv[2];

if (!databaseUrl) throw new Error('DATABASE_URL is required.');
if (!backupPath) throw new Error('Usage: npm run db:restore -- ./backups/file.dump');
if (process.env.RESTORE_CONFIRM !== 'I_UNDERSTAND_THIS_OVERWRITES_DATABASE') {
  throw new Error('Set RESTORE_CONFIRM=I_UNDERSTAND_THIS_OVERWRITES_DATABASE before restore.');
}

const resolvedBackupPath = path.resolve(backupPath);
await access(resolvedBackupPath);

function run(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: false });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

await run('pg_restore', ['--clean', '--if-exists', '--no-owner', '--no-acl', `--dbname=${databaseUrl}`, resolvedBackupPath]);
console.log(JSON.stringify({ restored: resolvedBackupPath }));
