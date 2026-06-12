import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import postgres from 'postgres';
import { normalizePostgresUrl } from '../src/lib/postgres-url';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required.');

const backupDir = path.resolve(process.env.BACKUP_DIR ?? './backups');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const output = path.join(backupDir, `taxdesk-${timestamp}.dump`);
const database = normalizePostgresUrl(databaseUrl);
const sql = postgres(database.url, { connection: database.connection });

async function createBackupRun() {
  const [run] = await sql<Array<{ id: string }>>`
    insert into backup_runs (status, backup_path)
    values ('running', ${output})
    returning id
  `;
  return run.id;
}

async function completeBackupRun(runId: string) {
  const file = await stat(output);
  await sql`
    update backup_runs
    set status = 'succeeded',
        completed_at = now(),
        size_bytes = ${file.size}
    where id = ${runId}
  `;
}

async function failBackupRun(runId: string, error: unknown) {
  await sql`
    update backup_runs
    set status = 'failed',
        completed_at = now(),
        error_message = ${error instanceof Error ? error.message : String(error)}
    where id = ${runId}
  `;
}

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
let backupRunId: string | null = null;
try {
  backupRunId = await createBackupRun();
} catch (error) {
  console.warn(`Could not create backup run record: ${error instanceof Error ? error.message : String(error)}`);
}
try {
  await run('pg_dump', ['--format=custom', '--no-owner', '--no-acl', `--file=${output}`, databaseUrl]);
  if (backupRunId) {
    try {
      await completeBackupRun(backupRunId);
    } catch (error) {
      console.warn(`Could not complete backup run record: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  console.log(JSON.stringify({ backup: output, backupRunId }));
} catch (error) {
  if (backupRunId) {
    try {
      await failBackupRun(backupRunId, error);
    } catch (recordError) {
      console.warn(`Could not fail backup run record: ${recordError instanceof Error ? recordError.message : String(recordError)}`);
    }
  }
  throw error;
} finally {
  await sql.end();
}
