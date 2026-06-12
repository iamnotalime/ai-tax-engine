import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import postgres from 'postgres';
import { normalizePostgresUrl } from '../src/lib/postgres-url';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required.');

const database = normalizePostgresUrl(databaseUrl);
const sql = postgres(database.url, { connection: database.connection });

async function main() {
  const migrationsDir = path.join(process.cwd(), 'migrations');
  await sql`
    create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `;

  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();
  const applied = await sql<Array<{ name: string }>>`select name from schema_migrations`;
  const appliedNames = new Set(applied.map((row) => row.name));

  for (const file of files) {
    if (appliedNames.has(file)) continue;
    const migrationSql = await readFile(path.join(migrationsDir, file), 'utf8');
    await sql.begin(async (tx) => {
      await tx.unsafe(migrationSql);
      await tx`insert into schema_migrations (name) values (${file})`;
    });
    console.log(`Applied ${file}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end();
  });
