import { embedMany, generateObject } from 'ai';
import { openai, type OpenAIResponsesProviderOptions } from '@ai-sdk/openai';
import { z } from 'zod';
import { env } from '@/config/env';
import { AppError } from '@/lib/errors';
import type { EmbeddingProvider, LlmProvider, StructuredLlmRequest, StructuredLlmResult } from './types';

type UsageShape = {
  inputTokens?: number;
  outputTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
};

function tokenInput(usage: unknown) {
  const u = usage as UsageShape | undefined;
  return u?.inputTokens ?? u?.promptTokens;
}

function tokenOutput(usage: unknown) {
  const u = usage as UsageShape | undefined;
  return u?.outputTokens ?? u?.completionTokens;
}

async function withAbortTimeout<T>(timeoutMs: number, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await run(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) throw new AppError('AI_PROVIDER_TIMEOUT', 'Permintaan AI melewati batas waktu.', 504);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export class OpenAiLlmProvider implements LlmProvider {
  readonly name = 'openai-ai-sdk-v5';
  readonly model = env.OPENAI_MODEL;

  async generateStructured<TSchema extends z.ZodTypeAny>(
    request: StructuredLlmRequest<TSchema>
  ): Promise<StructuredLlmResult<z.infer<TSchema>>> {
    if (!env.OPENAI_API_KEY) throw new AppError('AI_PROVIDER_NOT_CONFIGURED', 'OPENAI_API_KEY belum dikonfigurasi.', 500);

    const started = Date.now();
    try {
      const result = await withAbortTimeout(request.timeoutMs ?? env.LLM_TIMEOUT_MS, (abortSignal) =>
        generateObject({
          model: openai(this.model),
          system: request.systemPrompt,
          prompt: request.userPrompt,
          schema: request.schema,
          schemaName: request.schemaName,
          schemaDescription: `${request.schemaName} for Tax Emergency Desk. Return only facts supported by uploaded documents and retrieved tax knowledge.`,
          temperature: request.temperature ?? 0.1,
          abortSignal,
          providerOptions: {
            openai: {
              store: false,
              strictJsonSchema: false,
              parallelToolCalls: false
            } satisfies OpenAIResponsesProviderOptions
          }
        })
      );

      const data = request.schema.parse(result.object);
      return {
        data,
        rawText: JSON.stringify(result.object),
        tokenInput: tokenInput(result.usage),
        tokenOutput: tokenOutput(result.usage),
        latencyMs: Date.now() - started,
        model: this.model,
        provider: this.name
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new AppError('AI_PROVIDER_ERROR', `AI SDK v5 OpenAI error: ${message}`, 502);
    }
  }
}

export class OpenAiEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'openai-ai-sdk-v5';
  readonly model = env.OPENAI_EMBEDDING_MODEL;

  async embed(texts: string[]): Promise<number[][]> {
    if (!texts.length) return [];
    if (!env.OPENAI_API_KEY) throw new AppError('AI_PROVIDER_NOT_CONFIGURED', 'OPENAI_API_KEY belum dikonfigurasi.', 500);

    try {
      const result = await withAbortTimeout(env.LLM_TIMEOUT_MS, (abortSignal) =>
        embedMany({
          model: openai.textEmbedding(this.model),
          values: texts,
          abortSignal
        })
      );
      return result.embeddings;
    } catch (error) {
      if (error instanceof AppError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new AppError('AI_PROVIDER_ERROR', `AI SDK v5 OpenAI embedding error: ${message}`, 502);
    }
  }
}
