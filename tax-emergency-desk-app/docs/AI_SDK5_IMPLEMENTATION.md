# AI SDK v5 Implementation Notes

## Scope

This app uses AI SDK v5 for production model calls while preserving the existing provider boundary for local tests.

Implemented files:

- `package.json`
  - Adds `ai@^5.0.0`.
  - Adds `@ai-sdk/openai@^2.0.0`.
- `src/server/ai/providers/openai.ts`
  - Uses `generateObject` for structured tax-agent outputs.
  - Uses `embedMany` and `openai.textEmbedding()` for RAG embeddings.
  - Sets `providerOptions.openai.store = false`.
  - Keeps Zod validation after generation through the existing `runStructuredAi` path.
- `src/server/ai/prompts.ts`
  - Separates Indonesian `systemPrompt` and `userPrompt` sections for every tax-agent task.
  - Uses v2 prompt versions for evidence discipline, JSON-only output, and human-review boundaries.
- `src/server/ai/rag/retriever.ts`
  - Uses hybrid retrieval: PostgreSQL full-text sparse retrieval plus dense vector retrieval when embeddings are enabled.
  - Caches tenant-scoped retrieval results through `keyval_cache`.
- `docs/AGENTIC_RAG_WORKFLOW.md`
  - Documents where AI SDK v5 sits in the controlled agentic RAG workflow.

## Why keep the provider abstraction?

Do not call AI SDK directly from business workflows. All LLM calls must go through `runStructuredAi` so the system can persist:

- `ai_runs` provider/model/prompt version/status/latency;
- `ai_outputs` JSON payloads and raw text;
- source references and visibility flags;
- errors for reviewer/audit troubleshooting.
- cache hits with zero token counts, preserving an auditable `ai_runs`/`ai_outputs` trail.

The mock provider remains the default because CI, Codex edits, and local development should work without a live model API key.

## Production settings

Set these variables:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
LLM_TIMEOUT_MS=60000
KEYVAL_CACHE_ENABLED=true
AI_CACHE_TTL_SECONDS=604800
RAG_CACHE_TTL_SECONDS=86400
```

## Adding a new tax agent

1. Add or update a Zod schema under `src/server/ai/schemas`.
2. Add a prompt version constant in `src/server/ai/prompts.ts`.
3. Call `runStructuredAi` from the workflow.
4. Persist any domain-specific rows after schema validation.
5. Add tests using the mock provider.

## Guardrails

The AI SDK provider does not replace application-level guardrails. Keep these gates in place:

- no guarantee language;
- no fabricated evidence;
- source references for material claims;
- support check before reviewer workflow;
- human review for paid case-specific outputs.
