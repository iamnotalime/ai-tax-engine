import { env } from '@/config/env';
import { sha256 } from '@/lib/crypto';
import { sql } from '@/lib/db';
import { getKeyvalCache, setKeyvalCache } from '@/server/cache/keyval';
import { getEmbeddingProvider } from '@/server/ai/providers';

export type RetrievedContext = {
  id: string;
  title: string;
  text: string;
  sourceLabel: string;
  score: number;
};

function escapeSqlVector(vector: number[]) {
  return `[${vector.map((v) => Number(v).toFixed(6)).join(',')}]`;
}

async function retrieveSparseKnowledge(query: string, namespace: string, limit: number) {
  return sql<Array<{ id: string; title: string; text: string; sourceLabel: string; score: number }>>`
    with search_query as (
      select websearch_to_tsquery('simple', ${query}) as query
    )
    select
      id,
      title,
      text,
      source_label,
      ts_rank_cd(
        to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(text, '') || ' ' || coalesce(source_label, '')),
        search_query.query
      ) as score
    from knowledge_chunks, search_query
    where namespace = ${namespace}
      and to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(text, '') || ' ' || coalesce(source_label, '')) @@ search_query.query
    order by score desc, created_at desc
    limit ${limit}
  `;
}

async function retrieveHybridKnowledge(query: string, namespace: string, limit: number, vector: string) {
  const candidateLimit = Math.max(limit * 4, 12);
  return sql<Array<{ id: string; title: string; text: string; sourceLabel: string; score: number }>>`
    with
      search_query as (
        select websearch_to_tsquery('simple', ${query}) as query
      ),
      sparse as (
        select
          id,
          title,
          text,
          source_label,
          ts_rank_cd(
            to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(text, '') || ' ' || coalesce(source_label, '')),
            search_query.query
          ) as sparse_score,
          row_number() over (
            order by ts_rank_cd(
              to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(text, '') || ' ' || coalesce(source_label, '')),
              search_query.query
            ) desc, created_at desc
          ) as sparse_rank
        from knowledge_chunks, search_query
        where namespace = ${namespace}
          and to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(text, '') || ' ' || coalesce(source_label, '')) @@ search_query.query
        limit ${candidateLimit}
      ),
      dense as (
        select
          id,
          title,
          text,
          source_label,
          1 - (embedding <=> ${vector}::vector) as dense_score,
          row_number() over (order by embedding <=> ${vector}::vector) as dense_rank
        from knowledge_chunks
        where namespace = ${namespace}
          and embedding is not null
        order by embedding <=> ${vector}::vector
        limit ${candidateLimit}
      )
    select
      coalesce(sparse.id, dense.id) as id,
      coalesce(sparse.title, dense.title) as title,
      coalesce(sparse.text, dense.text) as text,
      coalesce(sparse.source_label, dense.source_label) as source_label,
      (
        coalesce(1.0 / (60 + sparse.sparse_rank), 0) +
        coalesce(1.0 / (60 + dense.dense_rank), 0) +
        coalesce(sparse.sparse_score, 0) * 0.05 +
        coalesce(dense.dense_score, 0) * 0.05
      ) as score
    from sparse
    full outer join dense on dense.id = sparse.id
    order by score desc
    limit ${limit}
  `;
}

async function retrieveFallbackKnowledge(namespace: string, limit: number) {
  return sql<Array<{ id: string; title: string; text: string; sourceLabel: string }>>`
    select id, title, text, source_label
    from knowledge_chunks
    where namespace = ${namespace}
    order by created_at asc
    limit ${limit}
  `;
}

export async function retrieveTaxKnowledge(query: string, namespace = 'tax_id', limit = 6, tenantId?: string): Promise<RetrievedContext[]> {
  const embeddingProvider = getEmbeddingProvider();
  const cacheKey = sha256(`hybrid:v1:${embeddingProvider.name}:${embeddingProvider.model}:${namespace}:${limit}:${query}`);
  const cached = tenantId
    ? await getKeyvalCache<RetrievedContext[]>({
        tenantId,
        namespace: 'rag:knowledge',
        key: cacheKey
      })
    : null;
  if (cached) return cached;

  if (embeddingProvider.name === 'mock') {
    const sparseRows = await retrieveSparseKnowledge(query, namespace, limit);
    const rows = sparseRows.length ? sparseRows : await retrieveFallbackKnowledge(namespace, limit);
    const result = rows.map((row, idx) => ({
      id: row.id,
      title: row.title,
      text: row.text,
      sourceLabel: row.sourceLabel,
      score: 'score' in row ? Number(row.score) : 1 - idx / 10
    }));
    if (tenantId) await setKeyvalCache({ tenantId, namespace: 'rag:knowledge', key: cacheKey, ttlSeconds: env.RAG_CACHE_TTL_SECONDS, value: result });
    return result;
  }

  const [embedding] = await embeddingProvider.embed([query]);
  const vector = escapeSqlVector(embedding);
  const rows = await retrieveHybridKnowledge(query, namespace, limit, vector);
  const result = rows.map((row) => ({ id: row.id, title: row.title, text: row.text, sourceLabel: row.sourceLabel, score: Number(row.score) }));
  if (tenantId) await setKeyvalCache({ tenantId, namespace: 'rag:knowledge', key: cacheKey, ttlSeconds: env.RAG_CACHE_TTL_SECONDS, value: result });
  return result;
}

export function renderRetrievedContext(items: RetrievedContext[]): string {
  if (!items.length) return 'Tidak ada konteks tambahan yang ditemukan.';
  return items
    .map((item, idx) => `[#${idx + 1}] ${item.title} — ${item.sourceLabel}\n${item.text.slice(0, 1200)}`)
    .join('\n\n---\n\n');
}
