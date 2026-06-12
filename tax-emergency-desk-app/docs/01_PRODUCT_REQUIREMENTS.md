# 01 — Product Requirements

## Product name

Working name: **Tax Emergency Desk**.

Alternative brand names:

- PajakDarurat
- ResponPajak AI
- TaxPack Indonesia
- KlarifikasiPajak

Use neutral, trustworthy language. Avoid names that imply guaranteed tax relief.

## Product thesis

Indonesian taxpayers, PKP, marketplace sellers, and small businesses often face urgent tax/document problems such as SP2DK, Coretax/e-Faktur errors, mismatched invoices, missing bukti potong, or confusing marketplace tax records. They need fast document organization, issue triage, and response drafting, but final case-specific advice should be reviewed by a professional.

The product creates **structured response packs** from messy documents. It is an AI-assisted workflow with human review for paid case-specific deliverables.

## Target users

### Primary ICPs

1. **UMKM / PKP owner**
   - Has received SP2DK or tax office request.
   - May have invoice/faktur/mutasi data scattered across email, WhatsApp, Excel, and Coretax.
   - Needs simple explanation and checklist.

2. **Marketplace seller**
   - Has Shopee/Tokopedia/TikTok Shop/Lazada reports.
   - Confused about omzet, settlement, fees, taxes, and SPT-ready summaries.
   - This is v1.1 unless easy to add.

3. **Finance/admin staff at small company**
   - Must respond to SP2DK or fix Coretax/e-Faktur issues.
   - Needs error explanation and document assembly.

4. **Tax consultant partner/reviewer**
   - Receives pre-structured case files.
   - Reviews final response, risk notes, and supporting evidence.

### Non-target users for MVP

- Large enterprises requiring complex tax litigation.
- Transfer pricing disputes.
- Tax audit/pemeriksaan representation.
- Tax planning or aggressive tax minimization.
- Cases requiring immediate litigation or criminal tax defense.
- Users seeking to hide income or fabricate documents.

## Core use cases

### Use Case A — SP2DK response pack

User receives SP2DK and wants to understand:

- what the KPP is asking;
- deadline and risk category;
- what documents are needed;
- what mismatch likely exists;
- how to structure a response;
- whether professional review is needed.

Deliverables:

- SP2DK issue summary;
- extracted metadata: KPP, date, deadline, tax period, issue type;
- evidence checklist;
- missing document list;
- draft response letter;
- attachment index;
- risk notes;
- reviewer comments.

### Use Case B — Coretax/e-Faktur error resolver

User encounters:

- Coretax screenshot error;
- e-Faktur import rejection;
- approval issue;
- XML format issue;
- faktur mismatch with SPT/daftar faktur;
- NITKU/NPWP buyer problem;
- bukti potong mismatch.

Deliverables:

- error classification;
- likely root causes;
- required fields/documents;
- step-by-step checklist;
- escalation notes;
- support-ticket summary if needed.

### Use Case C — Marketplace seller tax/profit pack, v1.1

User uploads marketplace reports. System produces:

- gross sales summary;
- marketplace fees/refunds/ads/affiliate/campaign costs;
- simple profit summary if HPP is provided;
- tax document checklist;
- export for accountant/tax reviewer.

## Product packages

### Free AI Scan

Goal: lead capture and trust-building.

Includes:

- document type classification;
- high-level issue summary;
- deadline extraction when visible;
- generic checklist;
- disclaimer: not a final opinion, not professionally reviewed.

Limitations:

- no draft formal response;
- no detailed tax interpretation;
- no final professional review.

### Self-Serve Checklist

Paid low-ticket or free gated asset.

Includes:

- document checklist;
- issue categorization;
- generic template guidance;
- no final case-specific professional advice unless upgraded.

### Reviewed Response Pack

Primary monetization.

Includes:

- AI-prepared case file;
- tax associate first-pass review;
- senior/reviewer approval;
- draft response letter;
- evidence matrix;
- attachment index;
- risk notes;
- next-step instructions.

### Full Consultation / Representation

Out of MVP unless partner is ready.

Requires:

- separate engagement;
- separate pricing;
- qualified representative;
- surat kuasa khusus if representing taxpayer.

## In scope for MVP

- SP2DK upload and triage.
- Coretax/e-Faktur screenshot/error triage.
- Document upload, classification, extraction.
- AI issue summary and evidence checklist.
- Draft response pack generation.
- Internal reviewer workflow.
- Human-approved final output.
- Basic payment state.
- User dashboard.
- Admin/reviewer dashboard.
- Outcome capture.

## Out of scope for MVP

- Filing/submitting to DJP/Coretax.
- Storing Coretax/DJP credentials.
- Representing taxpayer before KPP.
- Direct integration with Coretax.
- Automated tax filing.
- Guaranteed tax outcome.
- Complex audit/litigation case handling.
- Multi-language support beyond Indonesian.
- Mobile native app.

## Key screens

### Public

- Landing page: SP2DK help.
- Landing page: Coretax/e-Faktur error help.
- Pricing page.
- Trust/disclaimer page.
- Partner/reviewer page.

### User

- Login/signup.
- New case wizard.
- Document upload.
- AI scan result.
- Upgrade/payment screen.
- Case status timeline.
- Messages/request-more-docs.
- Deliverable viewer/download.
- Outcome feedback form.

### Ops/reviewer

- Case queue.
- Case detail.
- Document viewer.
- AI extraction panel.
- Evidence checklist editor.
- Draft editor.
- Review approval workflow.
- Request-more-docs tool.
- Deliverable generator.
- Outcome tracker.

## Success metrics

### Acquisition

- Visitor → free scan conversion.
- Free scan → document upload conversion.
- Free scan → paid pack conversion.
- Cost per qualified case.

### Product quality

- % documents classified correctly.
- % cases with complete metadata extraction.
- Reviewer correction rate.
- Reviewer agreement rate with AI issue classification.
- Time from upload to AI summary.
- Time from paid case to final reviewed pack.

### Business

- Revenue per case.
- Gross margin per case.
- Reviewer minutes per case.
- Repeat/upsell rate.
- Partner reviewer capacity.

### Trust/safety

- Complaint rate.
- Refund rate.
- Cases escalated because AI gave unsupported statements.
- Data access audit exceptions.
- Retention/deletion compliance.

## Required disclaimers in UI

Use short versions in UI and longer versions in Terms.

Short UI disclaimer:

> Output AI bersifat ringkasan, checklist, dan draft awal. Untuk kasus pajak spesifik, keputusan akhir harus direview oleh profesional/konsultan pajak yang kompeten. Kami tidak menjamin hasil, penerimaan tanggapan, pengurangan pajak, atau penyelesaian kasus.

Paid review disclaimer:

> Response pack yang direview disusun berdasarkan dokumen yang Anda berikan. Kelengkapan dan kebenaran dokumen tetap menjadi tanggung jawab Anda. Produk ini tidak otomatis menjadikan kami kuasa Wajib Pajak dan tidak termasuk penyampaian langsung ke DJP/KPP kecuali ada perjanjian terpisah.

## Case complexity tiers

### Low complexity

- SP2DK asks for simple clarification.
- One tax period.
- Supporting docs are mostly complete.
- No indication of audit/pemeriksaan/litigation.

### Medium complexity

- Multiple periods.
- PPN/PPh mismatch.
- Marketplace or bank statement reconciliation required.
- Multiple missing docs.

### High complexity

- Large nominal exposure.
- Potential audit escalation.
- Transfer pricing, international tax, criminal tax risk, tax collection dispute.
- Should require senior consultant or external specialist.

MVP should route high-complexity cases to manual consultation, not automated package.
