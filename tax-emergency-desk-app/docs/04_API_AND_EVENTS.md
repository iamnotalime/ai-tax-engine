# 04 — API and Events

This API spec assumes Next.js route handlers/server actions. Use REST-like routes for clarity. All endpoints must enforce server-side authorization.

## API conventions

- JSON request/response unless file upload.
- UUIDs for identifiers.
- Use `caseId`, `documentId`, `deliverableId` in path names.
- All mutations write `audit_logs` and `case_events` where relevant.
- Never trust client role. Derive from authenticated session.
- Every endpoint returns standardized errors.

## Standard error shape

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have access to this case.",
    "details": {}
  }
}
```

## Public endpoints

### `GET /api/public/config`

Returns public config: enabled packages, disclaimers, upload limits.

### `POST /api/leads/free-scan`

Creates a lead and optional draft case before account creation.

Request:

```json
{
  "email": "user@example.com",
  "phone": "+62812...",
  "caseType": "sp2dk_response",
  "sourceChannel": "google_ads_sp2dk"
}
```

Response:

```json
{
  "leadId": "uuid",
  "nextStep": "signup_or_upload"
}
```

## User case endpoints

### `POST /api/cases`

Creates a case.

Request:

```json
{
  "caseType": "sp2dk_response",
  "title": "SP2DK PPN 2024",
  "taxpayerType": "business",
  "taxpayerName": "PT Contoh Makmur",
  "sourceChannel": "google_ads"
}
```

Response:

```json
{
  "case": {
    "id": "uuid",
    "status": "intake_started"
  }
}
```

### `GET /api/cases`

Returns cases for logged-in user.

### `GET /api/cases/:caseId`

Returns case detail, documents, latest AI summary, payment status, deliverables allowed for the user.

### `PATCH /api/cases/:caseId/intake`

Updates intake fields.

Request:

```json
{
  "kppName": "KPP Pratama ...",
  "declaredDeadlineDate": "2026-06-24",
  "taxYears": [2024],
  "taxPeriods": ["2024-01", "2024-02"],
  "userNotes": "Saya diminta klarifikasi PPN dan mutasi rekening."
}
```

### `POST /api/cases/:caseId/consents`

Records consent for processing documents.

Request:

```json
{
  "consentType": "case_processing",
  "consentVersion": "2026-06-01",
  "granted": true
}
```

## Document endpoints

### `POST /api/cases/:caseId/documents/presign`

Creates signed upload URL or storage upload token.

Request:

```json
{
  "filename": "SP2DK.pdf",
  "mimeType": "application/pdf",
  "fileSizeBytes": 1234567,
  "categoryHint": "sp2dk_letter"
}
```

Response:

```json
{
  "documentId": "uuid",
  "uploadUrl": "signed-url",
  "storageKey": "cases/.../SP2DK.pdf",
  "expiresAt": "2026-06-10T12:00:00Z"
}
```

### `POST /api/cases/:caseId/documents/:documentId/complete`

Marks upload complete and enqueues classification/OCR.

Request:

```json
{
  "sha256Hash": "hexhash"
}
```

### `GET /api/cases/:caseId/documents`

Lists documents.

### `GET /api/cases/:caseId/documents/:documentId/download-url`

Returns short-lived signed download URL if authorized.

### `DELETE /api/cases/:caseId/documents/:documentId`

Soft-deletes document and logs action. Hard deletion should be handled by retention job.

## AI scan endpoints

### `POST /api/cases/:caseId/ai/free-scan`

Enqueues AI triage job after minimum document requirements.

Response:

```json
{
  "jobId": "uuid",
  "caseStatus": "ai_triage_queued"
}
```

### `GET /api/cases/:caseId/ai/latest-summary`

Returns latest user-visible AI summary.

### `POST /api/cases/:caseId/ai/retry`

Internal/ops only. Retries failed AI pipeline.

## Payment endpoints

### `POST /api/cases/:caseId/package-selection`

Request:

```json
{
  "packageCode": "reviewed_sp2dk_response_pack"
}
```

### `POST /api/cases/:caseId/payments`

Creates payment intent or manual payment instruction.

Request:

```json
{
  "packageCode": "reviewed_sp2dk_response_pack",
  "provider": "manual"
}
```

### `POST /api/payments/webhook/:provider`

Payment provider webhook. Validate signature.

## Internal ops endpoints

All require `ops` or `admin` unless stated.

### `GET /api/admin/cases`

Filter by status, case type, reviewer, risk, created date.

Query params:

```text
?status=paid&caseType=sp2dk_response&risk=high
```

### `GET /api/admin/cases/:caseId`

Full internal case detail.

### `POST /api/admin/cases/:caseId/status`

Changes status with reason. Must validate state transition.

Request:

```json
{
  "toStatus": "ops_review",
  "reason": "Payment confirmed"
}
```

### `POST /api/admin/cases/:caseId/request-more-docs`

Creates message/task for user.

Request:

```json
{
  "message": "Mohon upload mutasi rekening periode Jan-Mar 2024 dan faktur pajak terkait.",
  "requiredEvidenceItemIds": ["uuid"]
}
```

### `POST /api/admin/cases/:caseId/assign-reviewer`

Request:

```json
{
  "reviewerUserId": "uuid",
  "roleInCase": "first_pass"
}
```

## Reviewer endpoints

Require `tax_associate`, `licensed_tax_consultant`, or `admin` and case assignment unless admin.

### `GET /api/reviewer/queue`

Returns assigned/reviewable cases.

### `GET /api/reviewer/cases/:caseId/workbench`

Returns document extracts, AI summaries, draft, evidence items, issues, review checklist.

### `PATCH /api/reviewer/cases/:caseId/issues/:issueId`

Updates issue classification/severity/status.

### `PATCH /api/reviewer/cases/:caseId/evidence/:evidenceItemId`

Updates evidence status and notes.

### `POST /api/reviewer/cases/:caseId/reviews`

Submits review decision.

Request:

```json
{
  "reviewType": "first_pass",
  "decision": "request_more_docs",
  "comments": "Need bank statement for period mentioned in SP2DK.",
  "checklistJson": {
    "sourceReferencesVerified": true,
    "unsupportedClaimsRemoved": true,
    "deadlineVerified": true
  }
}
```

### `POST /api/reviewer/cases/:caseId/generate-deliverable`

Generates a draft deliverable version from current structured data. Reviewer can edit before approval.

### `POST /api/reviewer/deliverables/:deliverableId/approve`

Approves deliverable. Requires senior role for final response pack.

## Outcome endpoints

### `POST /api/cases/:caseId/outcome`

User or ops reports outcome.

Request:

```json
{
  "outcomeType": "request_more_docs",
  "outcomeDate": "2026-06-24",
  "notes": "KPP meminta tambahan bukti faktur pajak bulan Februari."
}
```

## Event model

Write `case_events` for:

- case created;
- document uploaded;
- AI job queued/started/succeeded/failed;
- free scan delivered;
- payment status changed;
- status changed;
- reviewer assigned;
- review submitted;
- more docs requested;
- deliverable approved;
- deliverable delivered;
- outcome recorded.

Event payload example:

```json
{
  "eventType": "review.submitted",
  "caseId": "uuid",
  "actorUserId": "uuid",
  "payload": {
    "reviewType": "senior_qc",
    "decision": "approve",
    "reviewId": "uuid"
  }
}
```

## Webhooks/events for future

Not required MVP, but keep event names stable:

- `case.created`
- `document.uploaded`
- `ai.triage.completed`
- `payment.paid`
- `review.completed`
- `deliverable.delivered`
- `outcome.recorded`

## Authorization matrix

| Endpoint group | user | ops | tax_associate | licensed_tax_consultant | admin |
|---|---:|---:|---:|---:|---:|
| User own case | yes | no | no | no | yes |
| Admin case list | no | yes | no | limited | yes |
| Reviewer workbench | no | limited | assigned only | assigned/QC only | yes |
| Download documents | own only | assigned/internal | assigned | assigned | yes |
| Approve final deliverable | no | no | no | assigned senior only | yes |
| Change payment | no | yes | no | no | yes |
| Delete data | own request only | no | no | no | yes |
