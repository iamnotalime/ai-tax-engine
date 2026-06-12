import { z } from 'zod';
import { env } from '@/config/env';
import { sha256 } from '@/lib/crypto';
import { jsonb, sql } from '@/lib/db';
import { getKeyvalCache, setKeyvalCache } from '@/server/cache/keyval';
import type { AiOutputType } from '@/server/db/types';
import { getLlmProvider } from './providers';

type AiRunRow = {
  id: string;
  status: string;
};

type AiOutputRow = {
  id: string;
};

type CachedAiResult = {
  data: unknown;
  rawText: string | null;
  confidence: number | null;
  sourceRefs: object[];
};

export async function runStructuredAi<TSchema extends z.ZodTypeAny>(params: {
  tenantId?: string;
  caseId?: string;
  documentId?: string;
  runType: string;
  promptVersion: string;
  outputType: AiOutputType;
  schemaName: string;
  schema: TSchema;
  systemPrompt: string;
  userPrompt: string;
  visibleToUser?: boolean;
}) {
  const provider = getLlmProvider();
  const inputHash = sha256(`${params.systemPrompt}\n\n${params.userPrompt}`);
  const cacheKey = sha256(`${provider.name}:${provider.model}:${params.runType}:${params.promptVersion}:${params.schemaName}:${inputHash}`);
  const [aiRun] = await sql<AiRunRow[]>`
    insert into ai_runs (
      case_id,
      document_id,
      run_type,
      provider,
      model,
      prompt_version,
      input_hash,
      status,
      started_at
    )
    values (
      ${params.caseId ?? null},
      ${params.documentId ?? null},
      ${params.runType},
      ${provider.name},
      ${provider.model},
      ${params.promptVersion},
      ${inputHash},
      'running',
      now()
    )
    returning *
  `;
  try {
    const cached = params.tenantId
      ? await getKeyvalCache<CachedAiResult>({
          tenantId: params.tenantId,
          namespace: 'ai:structured',
          key: cacheKey
        })
      : null;
    if (cached) {
      const data = params.schema.parse(cached.data);
      await sql`
        update ai_runs
        set
          status = 'succeeded',
          completed_at = now(),
          token_input = 0,
          token_output = 0,
          latency_ms = 0
        where id = ${aiRun.id}
      `;
      const [output] = await sql<AiOutputRow[]>`
        insert into ai_outputs (
          ai_run_id,
          case_id,
          output_type,
          schema_version,
          output_json,
          raw_text,
          confidence,
          source_refs,
          is_visible_to_user
        )
        values (
          ${aiRun.id},
          ${params.caseId ?? null},
          ${params.outputType},
          'v1',
          ${jsonb(data)},
          ${cached.rawText},
          ${cached.confidence},
          ${jsonb(cached.sourceRefs)},
          ${params.visibleToUser ?? false}
        )
        returning *
      `;
      return { aiRun: { ...aiRun, status: 'succeeded' }, output, data };
    }

    const result = await provider.generateStructured({
      systemPrompt: params.systemPrompt,
      userPrompt: params.userPrompt,
      schema: params.schema,
      schemaName: params.schemaName
    });
    await sql`
      update ai_runs
      set
        status = 'succeeded',
        completed_at = now(),
        token_input = ${result.tokenInput ?? null},
        token_output = ${result.tokenOutput ?? null},
        latency_ms = ${result.latencyMs ?? null}
      where id = ${aiRun.id}
    `;
    const [output] = await sql<AiOutputRow[]>`
      insert into ai_outputs (
        ai_run_id,
        case_id,
        output_type,
        schema_version,
        output_json,
        raw_text,
        confidence,
        source_refs,
        is_visible_to_user
      )
      values (
        ${aiRun.id},
        ${params.caseId ?? null},
        ${params.outputType},
        'v1',
        ${jsonb(result.data)},
        ${result.rawText ?? null},
        ${typeof (result.data as Record<string, unknown>).confidence === 'number' ? ((result.data as Record<string, unknown>).confidence as number) : null},
        ${jsonb(Array.isArray((result.data as Record<string, unknown>).source_refs) ? ((result.data as Record<string, unknown>).source_refs as object[]) : [])},
        ${params.visibleToUser ?? false}
      )
      returning *
    `;
    if (params.tenantId) {
      await setKeyvalCache({
        tenantId: params.tenantId,
        namespace: 'ai:structured',
        key: cacheKey,
        ttlSeconds: env.AI_CACHE_TTL_SECONDS,
        value: {
          data: result.data,
          rawText: result.rawText ?? null,
          confidence: typeof (result.data as Record<string, unknown>).confidence === 'number' ? ((result.data as Record<string, unknown>).confidence as number) : null,
          sourceRefs: Array.isArray((result.data as Record<string, unknown>).source_refs) ? ((result.data as Record<string, unknown>).source_refs as object[]) : []
        } satisfies CachedAiResult
      });
    }
    return { aiRun: { ...aiRun, status: 'succeeded' }, output, data: result.data };
  } catch (error) {
    await sql`
      update ai_runs
      set status = 'failed', completed_at = now(), error_message = ${error instanceof Error ? error.message : String(error)}
      where id = ${aiRun.id}
    `;
    throw error;
  }
}
