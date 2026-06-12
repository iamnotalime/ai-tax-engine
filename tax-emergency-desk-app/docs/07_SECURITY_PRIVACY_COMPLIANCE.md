# 07 — Security, Privacy, and Compliance Notes

## Important disclaimer

This file is product/security guidance, not legal advice. Before launch, have a qualified Indonesian lawyer and tax consultant review Terms, Privacy Policy, Data Processing Agreement, and consultant/reviewer contracts.

## Regulatory/source assumptions

Use these as baseline assumptions for product design:

- SP2DK is a request for explanation over tax data/information, and taxpayers are expected to respond within a limited period. Keep deadlines visible and do not hide uncertainty.
- Coretax is DJP's integrated tax administration system. Do not store user Coretax credentials.
- Consultants/tax representatives have formal requirements. Do not imply formal representation unless a qualified person and required documents are in place.
- Tax documents may contain personal and financial data. Treat them as highly sensitive.

See `SOURCES` section below for official references.

## Product positioning requirements

The product must never present itself as:

- autonomous tax consultant;
- guaranteed SP2DK solver;
- tax avoidance tool;
- official DJP/Kemenkeu service;
- formal tax representative unless separately engaged.

Use language:

- “ringkasan”;
- “checklist”;
- “draft awal”;
- “response pack yang direview”;
- “berdasarkan dokumen yang Anda berikan”.

Avoid language:

- “pasti beres”;
- “aman 100%”;
- “hapus risiko pajak”;
- “dijamin diterima KPP”;
- “tanpa perlu konsultan”.

## Data classification

### Highly sensitive

- NPWP/NIK/KTP.
- Bank statements.
- Tax returns/SPT.
- Faktur pajak.
- Bukti potong.
- Coretax screenshots.
- SP2DK letters.
- Business financial records.

### Internal sensitive

- Reviewer notes.
- Risk score.
- Draft response.
- Case outcome.
- Payment information.

### Public/non-sensitive

- Marketing content.
- Generic tax explainers.
- Public knowledge base.

## Consent flow

Before upload/processing:

User must consent to:

1. processing uploaded documents for case analysis;
2. use of AI/OCR providers for extraction/analysis;
3. human reviewer access if paid/reviewed package;
4. retention policy;
5. no guarantee of outcome.

Store consent in `consent_records` with:

- user_id;
- case_id;
- consent_type;
- consent_version;
- timestamp;
- IP/user agent.

## Data minimization

- Do not request Coretax credentials.
- Do not request documents unrelated to issue.
- For free scan, request only SP2DK/screenshot initially.
- For reviewed pack, request additional docs only via evidence checklist.
- Redact identifiers from AI input where feasible.

## AI data handling

### Default rule

Client documents may be used only to process that case. Do not use client data to train/fine-tune models by default.

### Provider configuration

Use providers/settings that support:

- no training on customer data where available;
- encryption in transit;
- enterprise/commercial terms if volume grows;
- auditability of requests;
- data retention control.

### Redaction

Before sending text to LLM:

- replace NPWP/NIK/account numbers with placeholders if exact values are not needed;
- preserve last 4 digits only if needed for matching;
- keep a local mapping in memory/job scope, not in prompt logs.

Example:

```text
NPWP: [NPWP_1]
Bank account: [BANK_ACCOUNT_1]
```

## Access control

### User

Can see:

- own cases;
- own documents;
- own deliverables;
- own messages.

### Ops

Can see assigned or all cases depending on permission. Cannot approve final professional output.

### Tax associate

Can see assigned cases only. Cannot final-approve unless also senior/qualified.

### Licensed consultant

Can final-review assigned cases. Can mark escalated.

### Admin

Can manage all but actions must be audited.

## Audit logging

Audit every:

- login/admin access to case;
- document download/view;
- AI run;
- status transition;
- reviewer assignment;
- review decision;
- deliverable approval;
- data export;
- data deletion;
- permission change.

Audit logs should be append-only at application level.

## Storage security

- Private bucket only.
- Signed URLs expire in minutes.
- Documents stored under case-based paths.
- Never expose direct storage keys in client-visible logs.
- Virus/malware scan if possible.
- File size and type validation.

Allowed MVP file types:

- PDF;
- PNG/JPG/WebP;
- CSV/XLS/XLSX;
- XML;
- TXT.

Disallowed:

- executables;
- scripts;
- password-protected archives unless manually handled.

## Retention policy

MVP default suggestion:

- Free scan abandoned cases: delete documents after 30 days.
- Paid cases: retain documents for 180 days after closure unless user requests deletion earlier and legal constraints allow.
- Audit logs: retain longer, but avoid storing raw sensitive data in logs.
- AI raw prompts/responses: retain for debugging for limited period, e.g. 30–90 days; then keep structured outputs only.

Make retention configurable.

## User deletion/export requests

MVP should support manual admin workflow:

- user requests deletion/export;
- admin verifies identity;
- system exports case data and documents;
- retention job deletes documents/AI raw data;
- audit log records deletion.

## Security baseline

Implement:

- HTTPS only;
- secure cookies;
- CSRF protection for forms/actions;
- server-side auth checks;
- strict file validation;
- environment variable management;
- encrypted secrets;
- dependency scanning;
- rate limiting for uploads and auth;
- logging without sensitive payloads;
- backup/restore plan.

## Abuse handling

If user asks to:

- fabricate invoices;
- alter faktur;
- hide income;
- delete evidence;
- misrepresent facts to KPP;

AI should refuse and route to compliance/senior review. Store event as `abuse_signal.detected`.

## Professional review and representation

### Reviewed response pack

Reviewer reviews draft/checklist based on documents. This is not automatically formal representation.

### Formal representation

Requires separate flow and documentation:

- engagement terms;
- qualified representative;
- surat kuasa khusus;
- scope of authority;
- uploaded supporting documents.

Do not implement representation in MVP unless legal/tax partner approves.

## Sources

Official sources used for product assumptions:

1. DJP SP2DK page: `https://pajak.go.id/panduan-layanan-pajak/konten/layanan-digital/2025/pengawasan/surat-wajib-pajak/surat-tanggapan-atas-surat-permintaan-penjelasan-data-dan-keterangan-%28sp2dk%29`
2. DJP Coretax page: `https://www.pajak.go.id/reformdjp/Coretax/`
3. DJP Kuasa Wajib Pajak page: `https://www.pajak.go.id/id/kuasa-wajib-pajak-0`
4. SIKOP Kemenkeu consultant search: `https://sikop.kemenkeu.go.id/front/carikonsultan`
5. UU PDP BPK page: `https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022`

Keep this file updated if law/regulation/product scope changes.
