# AI Tax Emergency Desk — Codex Start Here

## Purpose

Build an MVP for an **AI-assisted Tax Emergency Desk** for Indonesia. The first verticals are:

1. **SP2DK response preparation** — user uploads SP2DK and supporting documents; the system produces an issue summary, evidence checklist, draft response pack, and reviewer workflow.
2. **Coretax / e-Faktur error resolver** — user uploads screenshots/errors/XML/import files; the system produces a diagnosis, likely causes, checklist, and escalation notes.
3. **Marketplace seller tax/profit pack** — optional v1.1 add-on; user uploads marketplace settlement/order reports; the system produces tax/profit summary and document checklist.

The product is **not** an autonomous tax advisor. It is a document intake, analysis, drafting, and review workflow. Paid case-specific outputs must be human-reviewed by a qualified professional before delivery.

## Read order for Codex

1. `01_PRODUCT_REQUIREMENTS.md`
2. `02_SYSTEM_ARCHITECTURE.md`
3. `03_DATABASE_SCHEMA.md`
4. `04_API_AND_EVENTS.md`
5. `05_AI_PIPELINE_AND_PROMPTS.md`
6. `06_REVIEWER_WORKFLOW_AND_QA.md`
7. `07_SECURITY_PRIVACY_COMPLIANCE.md`
8. `08_IMPLEMENTATION_BACKLOG.md`
9. `09_TESTING_OBSERVABILITY.md`
10. `11_CONFIG_AND_ENV.md`
11. `12_SAMPLE_PAYLOADS.md`

`10_GTM_EXPERIMENTS.md` is for growth experiments and landing pages. Implement only the parts needed by the app.

## Non-negotiable product rules

1. **No guarantee language**. Never say a tax issue will be solved, SP2DK will be accepted, tax risk will disappear, or money/fines will be reduced.
2. **AI output is draft/checklist unless professionally reviewed.** The UI must make this explicit.
3. **No direct representation of taxpayer in MVP.** The MVP prepares documents. Formal representation as `kuasa wajib pajak` requires a separate flow, engagement letter, and qualified representative.
4. **No DJP/Coretax credential storage.** Do not ask users for Coretax username/password/passphrase. Users upload documents/screenshots themselves.
5. **No automatic filing/submission to DJP in MVP.** Generate response pack; user or their authorized representative submits.
6. **No client-data training by default.** AI runs can use user documents only to process the case, not to train/fine-tune models unless there is explicit opt-in and legal review.
7. **Every case-specific final output has source references.** Draft sections must cite uploaded document IDs/pages/rows that support the claim.
8. **Every human reviewer action is logged.** Who reviewed, when, what changed, and final approval state.
9. **Sensitive data handling by default.** NPWP/NIK/bank/tax data must be protected with strict access control, retention policy, and audit logs.

## MVP definition

MVP should support:

- Public landing page with product positioning and disclaimers.
- User account creation/login.
- Case intake wizard for SP2DK and Coretax/e-Faktur errors.
- Secure document upload.
- AI triage: document classification, issue summary, evidence checklist, risk flags.
- Payment placeholder/manual payment status or provider adapter.
- Internal ops dashboard.
- Reviewer dashboard for tax associate and senior reviewer.
- Final deliverable generator as Markdown/HTML first; PDF export can be a later task.
- Outcome tracking after delivery.

## Recommended initial stack

- **Frontend/full-stack**: Next.js App Router + TypeScript.
- **Database**: PostgreSQL.
- **ORM/migrations**: Prisma or Drizzle; choose one and keep schema typed.
- **Auth/storage**: Supabase Auth + Supabase Storage, or equivalent. Keep adapters isolated.
- **Queue/worker**: start with DB-backed job table; upgrade to BullMQ/Redis when volume grows.
- **AI**: provider-agnostic LLM adapter. Implement mock provider first for tests.
- **OCR**: provider abstraction. MVP can use manual text extraction + LLM vision/OCR adapter. Keep OCR provider swappable.
- **Payments**: interface first; manual status for MVP; later Xendit/Midtrans.

## Implementation philosophy

Build a **durable productized-service workflow**, not a chatbot.

The app should create structured case files that make human review faster. The moat comes from:

- structured intake;
- evidence assembly;
- reviewer workbench;
- template/outcome database;
- SEO/intent acquisition;
- qualified reviewer network.

## Definition of Done for MVP

A paying user should be able to:

1. Create an SP2DK case.
2. Upload SP2DK + at least 2 supporting docs.
3. Receive an AI-generated issue summary and evidence checklist.
4. Pay or be marked paid by admin.
5. Have a reviewer approve/revise the draft.
6. Download or view a final response pack.
7. Later submit outcome: accepted, request-more-docs, unresolved, escalated, etc.

Internal user should be able to:

1. View all cases and states.
2. Inspect documents and AI extraction.
3. Assign cases to reviewer.
4. Request more docs from user.
5. Approve final deliverable.
6. Track review SLA and case outcome.
