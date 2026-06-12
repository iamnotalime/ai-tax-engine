import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required.');

const backupDir = path.resolve(process.env.BACKUP_DIR ?? './backups');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const output = path.join(backupDir, `taxdesk-${timestamp}.dump`);

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

await mkdir(backupDir, { recursive: true });
await run('pg_dump', ['--format=custom', '--no-owner', '--no-acl', `--file=${output}`, databaseUrl]);
console.log(JSON.stringify({ backup: output }));
