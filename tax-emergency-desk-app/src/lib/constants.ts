export const CASE_STATUS_TRANSITIONS = {
  draft: ['intake_started', 'cancelled'],
  intake_started: ['docs_uploaded', 'cancelled'],
  docs_uploaded: ['ai_triage_queued', 'need_more_docs', 'cancelled'],
  ai_triage_queued: ['ai_triage_running', 'cancelled'],
  ai_triage_running: ['ai_triage_done', 'docs_uploaded', 'cancelled'],
  ai_triage_done: ['free_scan_delivered', 'waiting_payment', 'cancelled'],
  free_scan_delivered: ['waiting_payment', 'closed', 'cancelled'],
  waiting_payment: ['paid', 'cancelled'],
  paid: ['ops_review', 'cancelled'],
  ops_review: ['need_more_docs', 'reviewer_assigned', 'escalated'],
  need_more_docs: ['docs_uploaded', 'cancelled'],
  reviewer_assigned: ['reviewer_reviewing', 'need_more_docs', 'escalated'],
  reviewer_reviewing: ['senior_qc', 'need_more_docs', 'escalated'],
  senior_qc: ['final_draft_ready', 'reviewer_reviewing', 'escalated'],
  final_draft_ready: ['delivered'],
  delivered: ['outcome_pending', 'closed'],
  outcome_pending: ['closed'],
  closed: [],
  escalated: ['closed'],
  cancelled: []
} as const;

export const FREE_SCAN_DISCLAIMER =
  'AI scan ini hanya ringkasan awal dan checklist umum berdasarkan dokumen yang diunggah. Ini bukan opini pajak final dan tidak menjamin hasil. Untuk kasus spesifik, gunakan paket yang direview profesional.';

export const REVIEWED_PACK_DISCLAIMER =
  'Response pack ini disusun berdasarkan dokumen yang Anda berikan dan telah melalui proses review sesuai paket yang dipilih. Kelengkapan dan kebenaran dokumen tetap menjadi tanggung jawab Anda. Produk ini tidak otomatis menjadikan kami kuasa Wajib Pajak dan tidak termasuk penyampaian langsung ke DJP/KPP kecuali ada perjanjian terpisah.';

export const PACKAGES = [
  {
    code: 'free_ai_scan',
    name: 'Free AI Scan',
    priceIdr: 0,
    caseTypes: ['sp2dk_response', 'coretax_error', 'efaktur_error'],
    requiresHumanReview: false,
    deliverables: ['issue_summary', 'generic_checklist']
  },
  {
    code: 'reviewed_sp2dk_response_pack',
    name: 'Reviewed SP2DK Response Pack',
    priceIdr: 2_500_000,
    caseTypes: ['sp2dk_response'],
    requiresHumanReview: true,
    deliverables: ['issue_summary', 'evidence_matrix', 'draft_response_letter', 'attachment_index', 'reviewer_notes']
  },
  {
    code: 'coretax_error_resolution_pack',
    name: 'Coretax/e-Faktur Error Resolution Pack',
    priceIdr: 750_000,
    caseTypes: ['coretax_error', 'efaktur_error'],
    requiresHumanReview: true,
    deliverables: ['error_summary', 'likely_causes', 'fix_checklist', 'escalation_notes']
  }
] as const;

export const UPLOAD_LIMITS = {
  maxFilesFreeScan: 3,
  maxFilesPaidCase: 30
} as const;
