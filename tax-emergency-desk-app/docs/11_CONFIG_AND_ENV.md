# 11 — Configuration and Environment

## Environment variables

Use a schema validator for env vars at startup. The implemented app uses `src/config/env.ts`; keep this document synchronized with that file.

```env
# App
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_ENV=local
LOG_LEVEL=debug

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/taxdesk?schema=public

# Auth/session
AUTH_SECRET=replace-with-32-byte-random-string
SESSION_COOKIE_NAME=taxdesk_session

# Storage
STORAGE_DRIVER=local
LOCAL_STORAGE_ROOT=./.local/storage
S3_BUCKET=
S3_REGION=ap-southeast-3
S3_ENDPOINT=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_FORCE_PATH_STYLE=false
MAX_UPLOAD_BYTES=26214400
DOCUMENT_ENCRYPTION_KEY_BASE64=

# Upload security
MALWARE_SCANNING_MODE=disabled
CLAMAV_HOST=127.0.0.1
CLAMAV_PORT=3310
MALWARE_SCAN_TIMEOUT_MS=20000

# OCR
OCR_PROVIDER=manual
OCR_ENDPOINT=
OCR_API_KEY=
OCR_TIMEOUT_MS=60000

# AI
AI_PROVIDER=mock
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
LLM_TIMEOUT_MS=60000
JOB_BACKEND=db
TEMPORAL_ADDRESS=127.0.0.1:7233
TEMPORAL_NAMESPACE=default
TEMPORAL_TASK_QUEUE=taxdesk-workflows
TEMPORAL_TLS_ENABLED=false
KEYVAL_CACHE_ENABLED=true
AI_CACHE_TTL_SECONDS=604800
RAG_CACHE_TTL_SECONDS=86400
AI_RAW_RETENTION_DAYS=30
FREE_SCAN_RETENTION_DAYS=30
PAID_CASE_RETENTION_DAYS=180

# Worker/API secrets
INTERNAL_JOB_TOKEN=replace-with-cron-token
METRICS_TOKEN=replace-with-prometheus-token

# Security/privacy
RATE_LIMIT_ENABLED=true
REVIEW_ASSIGNMENT_REQUIRED=false
```

## Production hard gates

`APP_ENV=production` fails startup unless these controls are configured:

- `STORAGE_DRIVER=s3` with `S3_BUCKET`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY`.
- `DOCUMENT_ENCRYPTION_KEY_BASE64` set to a base64 key that decodes to 32 bytes.
- `MALWARE_SCANNING_MODE=clamd` with reachable ClamAV settings.
- `OCR_PROVIDER=external` with `OCR_ENDPOINT` and `OCR_API_KEY`.
- `AI_PROVIDER=openai` with `OPENAI_API_KEY`.
- `JOB_BACKEND=temporal` with reachable `TEMPORAL_ADDRESS`, `TEMPORAL_NAMESPACE`, and `TEMPORAL_TASK_QUEUE`.
- `KEYVAL_CACHE_ENABLED=true` for tenant-scoped AI/RAG cache reuse.
- `METRICS_TOKEN` set to a non-placeholder secret of at least 32 characters.
- `REVIEW_ASSIGNMENT_REQUIRED=true`.
- Non-localhost `NEXT_PUBLIC_APP_URL`.

## Metrics

`GET /api/metrics` exposes Prometheus text metrics and requires:

```http
Authorization: Bearer <METRICS_TOKEN>
```

The endpoint includes:

- `taxdesk_ai_provider_errors_total`
- `taxdesk_support_check_failures_total`
- `taxdesk_jobs_failed_total`
- `taxdesk_http_responses_total`
- `taxdesk_rate_limited_total`
- `taxdesk_privacy_requests_total`
- `taxdesk_retention_runs_total`
- `taxdesk_last_backup_success_timestamp`
- `taxdesk_last_retention_success_timestamp`
- `taxdesk_open_privacy_delete_requests`
- `taxdesk_oldest_open_privacy_delete_request_age_seconds`

Mutating API calls must include an `Origin` header matching `NEXT_PUBLIC_APP_URL`. Browser requests do this automatically for same-origin app traffic; scripted production smoke tests should set the header explicitly.

## Multi-tenancy

Every case belongs to a tenant. User access is granted through `tenant_memberships`; internal roles can operate only inside tenants where they are members. APIs accept `x-tenant-id` or `tenantId` query parameter when a tenant switcher is added; otherwise the user's default tenant is used.

## Retrieval and cache

Tax knowledge retrieval uses hybrid retrieval:

- sparse retrieval through PostgreSQL full-text search over title, text, and source label;
- dense retrieval through vector similarity when a production embedding provider is configured;
- fused ranking before prompt rendering;
- tenant-scoped `keyval_cache` entries for RAG results and structured AI outputs.

Spreadsheet uploads are intentionally disabled until a parser with no high-severity production advisory is selected. Accept CSV/XML exports instead.

## Feature flags

### `FEATURE_FREE_SCAN`

Enable/disable free AI scan.

### `FEATURE_PAYMENTS_MANUAL`

Allows admin to mark payment manually. Use in MVP.

### `FEATURE_PDF_EXPORT`

If false, deliver Markdown/HTML only.

### `FEATURE_MARKETPLACE_TAX_PACK`

Keep false until SP2DK/Coretax MVP works.

### `FEATURE_CORETAX_ERROR_RESOLVER`

Enable Coretax/e-Faktur error flow.

### `FEATURE_SP2DK_RESPONSE`

Enable SP2DK flow.

## Package configuration

Represent packages in config or database.

```json
[
  {
    "code": "free_ai_scan",
    "name": "Free AI Scan",
    "price_idr": 0,
    "case_types": ["sp2dk_response", "coretax_error", "efaktur_error"],
    "requires_human_review": false,
    "deliverables": ["issue_summary", "generic_checklist"]
  },
  {
    "code": "reviewed_sp2dk_response_pack",
    "name": "Reviewed SP2DK Response Pack",
    "price_idr": 2500000,
    "case_types": ["sp2dk_response"],
    "requires_human_review": true,
    "deliverables": ["issue_summary", "evidence_matrix", "draft_response_letter", "attachment_index", "reviewer_notes"]
  },
  {
    "code": "coretax_error_resolution_pack",
    "name": "Coretax/e-Faktur Error Resolution Pack",
    "price_idr": 750000,
    "case_types": ["coretax_error", "efaktur_error"],
    "requires_human_review": true,
    "deliverables": ["error_summary", "likely_causes", "fix_checklist", "escalation_notes"]
  }
]
```

## Upload limits

Suggested MVP defaults:

- Max file size: 25 MB.
- Max files per free scan: 3.
- Max files per paid case: 30.
- Allowed MIME types:
  - `application/pdf`
  - `image/png`
  - `image/jpeg`
  - `image/webp`
  - `text/plain`
  - `text/csv`
  - `application/xml`
  - `text/xml`

## Risk thresholds

```json
{
  "autoEscalate": {
    "criticalRisk": true,
    "potentialCriminalTaxLanguage": true,
    "auditOrInvestigationMentioned": true,
    "amountExposureIdrGreaterThan": 500000000,
    "userRequestsFabrication": true
  },
  "reviewRequired": {
    "paidCaseSpecificOutput": true,
    "sp2dkResponseDraft": true,
    "deadlineUncertain": true,
    "lowOcrConfidence": true
  }
}
```

## Case status transition map

Keep in code and test.

```json
{
  "draft": ["intake_started", "cancelled"],
  "intake_started": ["docs_uploaded", "cancelled"],
  "docs_uploaded": ["ai_triage_queued", "need_more_docs", "cancelled"],
  "ai_triage_queued": ["ai_triage_running", "cancelled"],
  "ai_triage_running": ["ai_triage_done", "docs_uploaded", "cancelled"],
  "ai_triage_done": ["free_scan_delivered", "waiting_payment", "cancelled"],
  "free_scan_delivered": ["waiting_payment", "closed", "cancelled"],
  "waiting_payment": ["paid", "cancelled"],
  "paid": ["ops_review", "cancelled"],
  "ops_review": ["need_more_docs", "reviewer_assigned", "escalated"],
  "need_more_docs": ["docs_uploaded", "cancelled"],
  "reviewer_assigned": ["reviewer_reviewing", "need_more_docs", "escalated"],
  "reviewer_reviewing": ["senior_qc", "need_more_docs", "escalated"],
  "senior_qc": ["final_draft_ready", "reviewer_reviewing", "escalated"],
  "final_draft_ready": ["delivered"],
  "delivered": ["outcome_pending", "closed"],
  "outcome_pending": ["closed"],
  "closed": [],
  "escalated": ["closed"],
  "cancelled": []
}
```

## UI copy constants

### Free scan disclaimer

```text
AI scan ini hanya ringkasan awal dan checklist umum berdasarkan dokumen yang diunggah. Ini bukan opini pajak final dan tidak menjamin hasil. Untuk kasus spesifik, gunakan paket yang direview profesional.
```

### Reviewed pack disclaimer

```text
Response pack ini disusun berdasarkan dokumen yang Anda berikan dan telah melalui proses review sesuai paket yang dipilih. Kelengkapan dan kebenaran dokumen tetap menjadi tanggung jawab Anda. Produk ini tidak otomatis menjadikan kami kuasa Wajib Pajak dan tidak termasuk penyampaian langsung ke DJP/KPP kecuali ada perjanjian terpisah.
```

## AI SDK v5 packages

The production AI provider uses Vercel AI SDK v5 packages:

```json
{
  "ai": "^5.0.0",
  "@ai-sdk/openai": "^2.0.0"
}
```

Do not upgrade these to AI SDK v6 without a migration pass; the OpenAI provider major version is intentionally pinned to the AI SDK v5-compatible line.
