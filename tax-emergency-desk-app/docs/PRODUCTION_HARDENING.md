# Production Hardening Notes

## Level A criteria used in this scaffold

1. Workflow state is persisted, not hidden in prompts.
2. Every AI run and output is stored with prompt version, model/provider, latency, and source refs.
3. Human review is first-class and audited.
4. Case status transitions are explicit and tested.
5. Sensitive identifiers are designed for hash/encrypted storage.
6. File upload limits and MIME validation are enforced.
7. Output guardrails detect guarantee language and fabrication intent.
8. AI providers are replaceable; mock provider enables deterministic testing.
9. DB-backed jobs allow retry and worker isolation.
10. Frontend copy keeps legal/product boundaries visible.

## Production controls implemented in this pass

- Production env now fails closed unless private S3-compatible storage is configured.
- Production env now requires document encryption, external OCR, ClamAV malware scanning, OpenAI AI provider, and reviewer assignment enforcement.
- Uploads no longer accept spreadsheet formats through the vulnerable `xlsx` parser path; CSV/XML/text/PDF/image flows remain.
- Document upload now runs signature validation, malware scanning, OCR/text extraction, encryption, and private storage.
- Data export, deletion request, deletion job, and retention sweep workflows are implemented.
- Admin has retention/data request visibility, and users have a privacy control page.
- CI now runs lint, typecheck, tests, build, and high-severity production dependency audit.

## Known external gates to close before real customer launch

- Provision private object storage with bucket policy, access logs, lifecycle rules, backup policy, and secret rotation.
- Provision ClamAV/clamd scanning infrastructure and alert on scanner failures.
- Contract and configure a production OCR/vision provider; validate confidence and data-processing terms.
- Add embedding backfill job for pgvector knowledge/document chunks.
- Add real payment provider adapter.
- Add email/WhatsApp notifications for missing documents.
- Add reviewer conflict-of-interest controls.
- Complete DPA, Terms, Privacy Policy, and reviewer contracts with counsel.
- Complete VAPT, backup/restore drill, incident response runbook, and production monitoring/alerting setup.

## AI SDK v5 hardening

- Keep `ai` on the v5 major line and `@ai-sdk/openai` on the v2 major line until an explicit v6 migration is planned.
- Run production model calls through `runStructuredAi`; do not call `generateObject` directly from route handlers.
- Keep OpenAI provider-side storage disabled through `providerOptions.openai.store = false`.
- Keep `abortSignal` timeout handling enabled for `generateObject` and `embedMany` calls.
- Add provider-level alerting on `AI_PROVIDER_TIMEOUT`, schema validation failures, and support-check failures.
- For any new provider, implement the same `LlmProvider`/`EmbeddingProvider` interfaces and add a mock test path.
