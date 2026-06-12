import { z } from 'zod';

export type StructuredLlmRequest<TSchema extends z.ZodTypeAny> = {
  systemPrompt: string;
  userPrompt: string;
  schema: TSchema;
  schemaName: string;
  temperature?: number;
  timeoutMs?: number;
};

export type StructuredLlmResult<T> = {
  data: T;
  rawText: string;
  tokenInput?: number;
  tokenOutput?: number;
  latencyMs: number;
  model: string;
  provider: string;
};

export interface LlmProvider {
  readonly name: string;
  readonly model: string;
  generateStructured<TSchema extends z.ZodTypeAny>(
    request: StructuredLlmRequest<TSchema>
  ): Promise<StructuredLlmResult<z.infer<TSchema>>>;
}

export interface EmbeddingProvider {
  readonly name: string;
  readonly model: string;
  embed(texts: string[]): Promise<number[][]>;
}
