import { env } from '@/config/env';
import { jsonb, sql } from '@/lib/db';

type CacheRow<T> = {
  value: T;
};

export async function getKeyvalCache<T>(params: {
  tenantId: string;
  namespace: string;
  key: string;
}): Promise<T | null> {
  if (!env.KEYVAL_CACHE_ENABLED) return null;
  const [row] = await sql<CacheRow<T>[]>`
    select value
    from keyval_cache
    where tenant_id = ${params.tenantId}
      and namespace = ${params.namespace}
      and key = ${params.key}
      and (expires_at is null or expires_at > now())
    limit 1
  `;
  return row?.value ?? null;
}

export async function setKeyvalCache(params: {
  tenantId: string;
  namespace: string;
  key: string;
  value: unknown;
  ttlSeconds: number;
}) {
  if (!env.KEYVAL_CACHE_ENABLED) return;
  await sql`
    insert into keyval_cache (tenant_id, namespace, key, value, expires_at, created_at, updated_at)
    values (
      ${params.tenantId},
      ${params.namespace},
      ${params.key},
      ${jsonb(params.value)},
      now() + (${params.ttlSeconds} * interval '1 second'),
      now(),
      now()
    )
    on conflict (tenant_id, namespace, key) do update set
      value = excluded.value,
      expires_at = excluded.expires_at,
      updated_at = now()
  `;
}

export async function cleanupExpiredKeyvalCache(limit = 1000) {
  const rows = await sql<Array<{ tenantId: string; namespace: string; key: string }>>`
    delete from keyval_cache
    where (tenant_id, namespace, key) in (
      select tenant_id, namespace, key
      from keyval_cache
      where expires_at is not null and expires_at <= now()
      limit ${limit}
    )
    returning tenant_id, namespace, key
  `;
  return rows.length;
}
