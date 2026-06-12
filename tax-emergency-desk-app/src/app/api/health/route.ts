import { env } from '@/config/env';
import { sql } from '@/lib/db';

export async function GET() {
  const started = Date.now();
  try {
    await sql`select 1`;
    return Response.json({
      status: 'ok',
      appEnv: env.APP_ENV,
      checks: { database: 'ok' },
      latencyMs: Date.now() - started
    });
  } catch {
    return Response.json(
      {
        status: 'degraded',
        appEnv: env.APP_ENV,
        checks: { database: 'failed' },
        latencyMs: Date.now() - started
      },
      { status: 503 }
    );
  }
}
