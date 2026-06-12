import postgres from 'postgres';
import { env } from '@/config/env';
import { normalizePostgresUrl } from './postgres-url';

type SqlClient = ReturnType<typeof postgres>;

const globalForPostgres = globalThis as unknown as { sql?: SqlClient };
const database = normalizePostgresUrl(env.DATABASE_URL);

export const sql =
  globalForPostgres.sql ??
  postgres(database.url, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    connection: database.connection,
    transform: postgres.camel
  });

if (process.env.NODE_ENV !== 'production') globalForPostgres.sql = sql;

export function jsonb(value: unknown) {
  return sql.json(value as postgres.JSONValue);
}
