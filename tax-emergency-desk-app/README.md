# Tax Emergency Desk

AI-assisted productized-service workflow for Indonesian tax emergency cases: SP2DK response packs, Coretax/e-Faktur error packs, and reviewer workbench.

This repository is intentionally built as a durable production scaffold, not a chatbot demo.

## What is implemented

- Next.js App Router + TypeScript app.
- PostgreSQL schema with workflow-first case, document, AI run, reviewer, deliverable, payment, job, consent, and audit models.
- RAG/agentic workflow:
  1. document text extraction/OCR abstraction;
  2. document classification;
  3. SP2DK or Coretax/e-Faktur extraction;
  4. retrieval from tax knowledge base;
  5. evidence checklist generation;
  6. draft response generation;
  7. hallucination/support check;
  8. human reviewer workbench;
  9. deliverable versioning and outcome tracking.
- AI SDK v5-backed provider layer: mock provider for tests/local development and OpenAI provider through `ai@5` + `@ai-sdk/openai@2` in production.
- Multi-tenant workspace isolation for cases, jobs, audit logs, privacy requests, and cache entries.
- Temporal workflow orchestration for production triage jobs, with DB-backed queue fallback for local development.
- Tenant-scoped key-value cache for structured AI and hybrid RAG retrieval results.
- Hybrid retrieval over tax knowledge: sparse PostgreSQL full-text search plus dense vector search when embeddings are enabled.
- Secure auth scaffold with httpOnly JWT cookie and role-based authorization.
- Local storage adapter for MVP; keep private storage semantics.
- Public landing page, case intake wizard, dashboard, reviewer queue, reviewer workbench, and admin command room.
- Guardrails against guarantee language and document fabrication requests.
- Tests for status transitions, guardrails, and RAG chunking.

## Product boundary

The app never claims to be an official DJP/Kemenkeu service, never stores Coretax credentials, never auto-files to DJP, and never guarantees tax outcomes. AI outputs are draft/checklist material. Paid case-specific output requires professional review.

## Local setup

```bash
cp .env.example .env
# Fill AUTH_SECRET and INTERNAL_JOB_TOKEN with random values.
docker compose up -d
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

In a second terminal:

```bash
npm run worker
```

For Temporal-backed orchestration, set `JOB_BACKEND=temporal`, run a Temporal service, then start the Temporal worker:

```bash
docker compose -f docker-compose.yml -f docker-compose.temporal.yml up -d
npm run temporal:worker
```

If npm fails on Windows/Node with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, run install with the Windows certificate store enabled:

```powershell
$env:NODE_OPTIONS='--use-system-ca'; npm install
```

Seed accounts use password `ChangeMe123!`:

- `user@example.com`
- `ops@example.com`
- `reviewer@example.com`

## Production checklist before launch

- Configure `APP_ENV=production`; startup will fail unless S3 private storage, document encryption, ClamAV malware scanning, external OCR, OpenAI provider, and reviewer assignment enforcement are configured.
- Complete VAPT/security review.
- Complete legal review for Terms, Privacy Policy, DPA, and reviewer agreements.
- Verify licensed tax consultant identity via official channels before showing reviewed-by-licensed-consultant claims.
- Configure database backups, monitoring, alerting, secret rotation, and restore drills.
- Generate production secrets with `npm run secrets:generate`.
- Validate release readiness with `npm run production:check`.
- Run `npm run retention:run` on a schedule or enqueue `retention_sweep`.
- Run shadow QA with synthetic and professionally reviewed fixtures before charging users.
- See `docs/ENTERPRISE_PRODUCTION_RUNBOOK.md`.

## Architecture notes

See `docs/02_SYSTEM_ARCHITECTURE.md`, `docs/03_DATABASE_SCHEMA.md`, and `docs/05_AI_PIPELINE_AND_PROMPTS.md` for design rationale and schemas.

## AI SDK v5 implementation

Production LLM and embedding calls are implemented through Vercel AI SDK v5 in `src/server/ai/providers/openai.ts`:

- `generateObject` powers schema-validated tax agents.
- `embedMany` powers OpenAI text embeddings for RAG.
- OpenAI Responses API is selected through the AI SDK OpenAI provider.
- The mock provider remains the default for local development and tests.

Set `AI_PROVIDER=openai`, `OPENAI_API_KEY`, `OPENAI_MODEL`, and `OPENAI_EMBEDDING_MODEL` in `.env` to enable production AI calls.
