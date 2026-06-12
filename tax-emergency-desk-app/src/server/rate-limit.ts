import { NextRequest } from 'next/server';
import { env } from '@/config/env';
import { sha256 } from '@/lib/crypto';
import { sql } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { getClientIp } from '@/lib/http';
import { recordMonitoringEvent } from '@/server/observability/metrics';

type RateLimitPolicy = {
  namespace: string;
  limit: number;
  windowMs: number;
};

type RateLimitRow = {
  count: number;
  expiresAt: Date;
};

export const RATE_LIMITS = {
  authIp: { namespace: 'auth:ip', limit: 30, windowMs: 15 * 60 * 1000 },
  authIdentity: { namespace: 'auth:identity', limit: 8, windowMs: 15 * 60 * 1000 },
  signupIp: { namespace: 'signup:ip', limit: 8, windowMs: 60 * 60 * 1000 },
  caseCreate: { namespace: 'case:create', limit: 20, windowMs: 60 * 60 * 1000 },
  uploadCase: { namespace: 'upload:case', limit: 25, windowMs: 60 * 60 * 1000 },
  triageCase: { namespace: 'triage:case', limit: 5, windowMs: 10 * 60 * 1000 },
  privacyExport: { namespace: 'privacy:export', limit: 3, windowMs: 60 * 60 * 1000 },
  privacyDelete: { namespace: 'privacy:delete', limit: 2, windowMs: 24 * 60 * 60 * 1000 },
  internalJobRunner: { namespace: 'internal:jobs:run', limit: 120, windowMs: 60 * 1000 }
} satisfies Record<string, RateLimitPolicy>;

function rateLimitKey(policy: RateLimitPolicy, parts: string[]) {
  return `${policy.namespace}:${sha256(parts.join('|'))}`;
}

export async function assertRateLimit(req: NextRequest, policy: RateLimitPolicy, identityParts: string[] = []) {
  if (!env.RATE_LIMIT_ENABLED) return;

  const identity = identityParts.length ? identityParts : [getClientIp(req) ?? 'unknown'];
  const key = rateLimitKey(policy, identity);
  const expiresAt = new Date(Date.now() + policy.windowMs);

  const rows = await sql<RateLimitRow[]>`
    insert into rate_limit_buckets ("key", window_start, count, expires_at, created_at, updated_at)
    values (${key}, now(), 1, ${expiresAt}, now(), now())
    on conflict ("key") do update set
      window_start = case
        when rate_limit_buckets.expires_at <= now() then now()
        else rate_limit_buckets.window_start
      end,
      count = case
        when rate_limit_buckets.expires_at <= now() then 1
        else rate_limit_buckets.count + 1
      end,
      expires_at = case
        when rate_limit_buckets.expires_at <= now() then ${expiresAt}
        else rate_limit_buckets.expires_at
      end,
      updated_at = now()
    returning count, expires_at as "expiresAt"
  `;

  const row = rows[0];
  if (!row || row.count <= policy.limit) return;

  const retryAfterSeconds = Math.max(1, Math.ceil((new Date(row.expiresAt).getTime() - Date.now()) / 1000));
  await recordMonitoringEvent({
    metricName: 'taxdesk_rate_limited_total',
    eventType: 'rate_limit.exceeded',
    labels: { namespace: policy.namespace },
    payload: { retryAfterSeconds, limit: policy.limit, windowMs: policy.windowMs }
  });
  throw new AppError('RATE_LIMITED', 'Terlalu banyak request. Coba lagi nanti.', 429, {
    retryAfterSeconds,
    limit: policy.limit,
    windowMs: policy.windowMs
  });
}
