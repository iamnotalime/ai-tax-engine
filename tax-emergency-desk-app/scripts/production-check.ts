import net from 'node:net';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../src/config/env';
import { sql } from '../src/lib/db';
import { getStorageAdapter } from '../src/server/storage';

type Check = {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message?: string;
};

const checks: Check[] = [];

function pass(name: string, message?: string) {
  checks.push({ name, status: 'pass', message });
}

function fail(name: string, message: string) {
  checks.push({ name, status: 'fail', message });
}

function warn(name: string, message: string) {
  checks.push({ name, status: 'warn', message });
}

async function checkDatabase() {
  await sql`select 1`;
  const migrations = await sql<Array<{ name: string }>>`select name from schema_migrations`;
  const names = new Set(migrations.map((row) => row.name));
  if (!names.has('004_multi_tenant_temporal_keyval.sql')) {
    fail('database.migrations', '004_multi_tenant_temporal_keyval.sql has not been applied.');
    return;
  }
  pass('database.migrations', `${migrations.length} migrations applied.`);
}

async function checkStorage() {
  const storage = getStorageAdapter();
  const key = `production-check/${Date.now()}-${Math.random().toString(16).slice(2)}.txt`;
  await storage.putObject({
    key,
    buffer: Buffer.from('taxdesk production storage check'),
    contentType: 'text/plain',
    metadata: { purpose: 'production-check' }
  });
  await storage.deleteObject(key);
  pass('storage.s3', `put/delete smoke test passed on ${storage.driver}.`);
}

function clamdPing() {
  return new Promise<void>((resolve, reject) => {
    const socket = net.createConnection({ host: env.CLAMAV_HOST, port: env.CLAMAV_PORT });
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error('ClamAV ping timed out.'));
    }, env.MALWARE_SCAN_TIMEOUT_MS);
    const chunks: Buffer[] = [];
    socket.on('connect', () => socket.write('zPING\0'));
    socket.on('data', (chunk) => chunks.push(chunk));
    socket.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    socket.on('end', () => {
      clearTimeout(timer);
      const response = Buffer.concat(chunks).toString('utf8').trim();
      if (response === 'PONG') resolve();
      else reject(new Error(`Unexpected ClamAV response: ${response}`));
    });
  });
}

async function checkClamAv() {
  await clamdPing();
  pass('malware.clamd', 'ClamAV ping returned PONG.');
}

async function checkTemporal() {
  const separator = env.TEMPORAL_ADDRESS.lastIndexOf(':');
  if (separator <= 0) throw new Error('TEMPORAL_ADDRESS must be host:port.');
  const host = env.TEMPORAL_ADDRESS.slice(0, separator);
  const port = Number(env.TEMPORAL_ADDRESS.slice(separator + 1));
  if (!Number.isInteger(port) || port <= 0) throw new Error('TEMPORAL_ADDRESS port is invalid.');
  await new Promise<void>((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error('Temporal TCP connect timed out.'));
    }, 5000);
    socket.on('connect', () => {
      clearTimeout(timer);
      socket.end();
      resolve();
    });
    socket.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
  pass('workflow.temporal', `Temporal reachable at ${env.TEMPORAL_ADDRESS}.`);
}

async function checkEvidenceFile(filename: string, label: string) {
  const filePath = path.join(process.cwd(), 'docs', 'evidence', filename);
  const content = await readFile(filePath, 'utf8');
  if (/status:\s*approved/i.test(content)) {
    pass(`evidence.${label}`, `${filename} approved.`);
    return;
  }
  fail(`evidence.${label}`, `${filename} must contain "status: approved".`);
}

async function runCheck(name: string, check: () => Promise<void>) {
  try {
    await check();
  } catch (error) {
    fail(name, error instanceof Error ? error.message : String(error));
  }
}

if (env.APP_ENV !== 'production') fail('env.APP_ENV', 'Run with APP_ENV=production.');
else pass('env.APP_ENV', 'production');
if (env.JOB_BACKEND === 'temporal') pass('env.JOB_BACKEND', 'temporal');
if (env.KEYVAL_CACHE_ENABLED) pass('env.KEYVAL_CACHE_ENABLED', 'true');

await runCheck('database', checkDatabase);

if (process.env.PRODUCTION_CHECK_SKIP_EXTERNALS === 'true') {
  warn('external.smoke', 'Skipped S3 and ClamAV smoke tests because PRODUCTION_CHECK_SKIP_EXTERNALS=true.');
} else {
  await runCheck('storage.s3', checkStorage);
  await runCheck('malware.clamd', checkClamAv);
  await runCheck('workflow.temporal', checkTemporal);
}

await runCheck('evidence.vapt', () => checkEvidenceFile('VAPT_APPROVAL.md', 'vapt'));
await runCheck('evidence.legal', () => checkEvidenceFile('LEGAL_APPROVAL.md', 'legal'));
await runCheck('evidence.backup_restore', () => checkEvidenceFile('BACKUP_RESTORE_DRILL.md', 'backup_restore'));
await runCheck('evidence.incident_response', () => checkEvidenceFile('INCIDENT_RESPONSE_DRILL.md', 'incident_response'));
await runCheck('evidence.monitoring', () => checkEvidenceFile('MONITORING_ALERT_TEST.md', 'monitoring'));

await sql.end();

const failed = checks.filter((check) => check.status === 'fail');
console.log(JSON.stringify({ status: failed.length ? 'fail' : 'pass', checks }, null, 2));
if (failed.length) process.exitCode = 1;
