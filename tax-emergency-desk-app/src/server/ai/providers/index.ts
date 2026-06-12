import { env } from '@/config/env';
import { MockEmbeddingProvider, MockLlmProvider } from './mock';
import { OpenAiEmbeddingProvider, OpenAiLlmProvider } from './openai';
import type { EmbeddingProvider, LlmProvider } from './types';

export function getLlmProvider(): LlmProvider {
  if (env.AI_PROVIDER === 'openai') return new OpenAiLlmProvider();
  return new MockLlmProvider();
}

export function getEmbeddingProvider(): EmbeddingProvider {
  if (env.AI_PROVIDER === 'openai') return new OpenAiEmbeddingProvider();
  return new MockEmbeddingProvider();
}
