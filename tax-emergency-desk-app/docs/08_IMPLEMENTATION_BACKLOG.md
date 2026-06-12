# 08 — Implementation Backlog

## MVP phases

### Phase 0 — Project skeleton

Goal: typed monolith with auth, DB, storage, and tests.

Tasks:

- [ ] Initialize Next.js + TypeScript project.
- [ ] Configure linting/formatting/typecheck.
- [ ] Configure PostgreSQL and ORM.
- [ ] Add auth provider.
- [ ] Add private storage adapter.
- [ ] Add environment config validation.
- [ ] Add basic CI: typecheck, lint, test.
- [ ] Add seed users: admin, ops, reviewer, user.

Acceptance:

- App runs locally.
- DB migrations apply cleanly.
- Auth works.
- Admin can log in.

### Phase 1 — Case intake and document upload

Goal: user can create a case and upload documents securely.

Tasks:

- [ ] Public landing page for SP2DK.
- [ ] Signup/login.
- [ ] Case creation wizard.
- [ ] Consent screen.
- [ ] Document upload with signed URL.
- [ ] Document list and status.
- [ ] Admin case list.
- [ ] Audit logs for upload/download.

Acceptance:

- User creates SP2DK case.
- User uploads PDF/image.
- Admin sees case and document metadata.
- Unauthorized users cannot access documents.

### Phase 2 — AI/OCR pipeline

Goal: classify documents and generate free scan.

Tasks:

- [ ] DB-backed job worker.
- [ ] OCR provider adapter with mock/manual fallback.
- [ ] LLM provider adapter with mock provider.
- [ ] Document classification job.
- [ ] SP2DK extraction job.
- [ ] Issue summary job.
- [ ] Evidence checklist job.
- [ ] AI output validation.
- [ ] Free scan UI.

Acceptance:

- Uploading SP2DK triggers pipeline.
- Free scan summary appears.
- Failed jobs can be retried by admin.

### Phase 3 — Payment/package state

Goal: user can upgrade to reviewed response pack.

Tasks:

- [ ] Package selection UI.
- [ ] Payment table and manual payment provider.
- [ ] Admin mark as paid.
- [ ] Status transitions: waiting_payment → paid → ops_review.
- [ ] Payment events/audit logs.

Acceptance:

- User selects package.
- Admin marks paid.
- Case enters ops/reviewer queue.

### Phase 4 — Reviewer workbench

Goal: tax associate/senior reviewer can review case.

Tasks:

- [ ] Reviewer queue.
- [ ] Case workbench with documents, AI summary, extraction.
- [ ] Evidence checklist editor.
- [ ] Issue editor.
- [ ] Request-more-docs messaging.
- [ ] Reviewer assignment.
- [ ] Review decision submission.
- [ ] Senior QC flow.

Acceptance:

- Admin assigns reviewer.
- Reviewer edits/approves evidence and draft.
- Senior approves final.

### Phase 5 — Deliverable generation

Goal: final response pack is generated and delivered.

Tasks:

- [ ] Markdown deliverable generator.
- [ ] Draft response letter generator.
- [ ] Attachment index generation.
- [ ] Deliverable versioning.
- [ ] Approval gate.
- [ ] User deliverable viewer/download.

Acceptance:

- Reviewer generates draft.
- Senior approves.
- User sees delivered response pack.

### Phase 6 — Outcome capture and analytics

Goal: build data moat and feedback loop.

Tasks:

- [ ] Outcome form.
- [ ] Outcome reminders.
- [ ] Outcome admin view.
- [ ] Analytics: review time, correction rate, case status funnel.
- [ ] Export anonymized case metrics.

Acceptance:

- User can report outcome.
- Admin can see outcome history.

## User stories

### User

- As a user, I can create an SP2DK case so that I can understand what to prepare.
- As a user, I can upload documents securely.
- As a user, I can see a free AI scan with clear disclaimers.
- As a user, I can upgrade to reviewed response pack.
- As a user, I can respond to requests for missing documents.
- As a user, I can download final deliverable.
- As a user, I can delete/export my data by request.

### Ops

- As ops, I can view cases by status.
- As ops, I can request missing documents.
- As ops, I can assign reviewers.
- As ops, I can mark manual payment paid/refunded.
- As ops, I can track SLA.

### Reviewer

- As reviewer, I can view assigned cases.
- As reviewer, I can inspect documents and AI outputs.
- As reviewer, I can edit evidence checklist.
- As reviewer, I can submit review decision.
- As senior reviewer, I can approve final response pack.

### Admin

- As admin, I can manage users/roles.
- As admin, I can audit access logs.
- As admin, I can manage templates.
- As admin, I can see outcome analytics.

## Priority build order

1. Auth + cases + docs.
2. Manual admin/reviewer workflow.
3. AI pipeline with mock provider.
4. Real OCR/LLM adapter.
5. Deliverable generation.
6. Payments.
7. Outcome capture.

This order lets the business run manually even if AI is imperfect.

## Technical debt rules

Allowed MVP shortcuts:

- manual payment confirmation;
- Markdown instead of PDF;
- DB-backed queue;
- mock AI fixtures for local dev;
- manual OCR fallback.

Not allowed shortcuts:

- missing authorization checks;
- public storage buckets;
- no audit logs;
- hard-coded role bypass;
- no disclaimer on AI output;
- unvalidated AI JSON;
- storing portal credentials.

## Definition of Ready for a feature

- User story is clear.
- Roles/permissions are clear.
- DB fields exist or migration planned.
- Security implications considered.
- Tests defined.

## Definition of Done for a feature

- Typecheck passes.
- Tests pass.
- Audit log written for sensitive action.
- Authorization checked server-side.
- Error states handled.
- Empty/loading states implemented.
- Documentation updated if behavior changed.
