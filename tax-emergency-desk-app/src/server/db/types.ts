export const UserRole = {
  user: 'user',
  support: 'support',
  ops: 'ops',
  tax_associate: 'tax_associate',
  licensed_tax_consultant: 'licensed_tax_consultant',
  admin: 'admin'
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const CaseType = {
  sp2dk_response: 'sp2dk_response',
  coretax_error: 'coretax_error',
  efaktur_error: 'efaktur_error',
  marketplace_tax_pack: 'marketplace_tax_pack',
  generic_tax_issue: 'generic_tax_issue'
} as const;
export type CaseType = (typeof CaseType)[keyof typeof CaseType];

export const CaseStatus = {
  draft: 'draft',
  intake_started: 'intake_started',
  docs_uploaded: 'docs_uploaded',
  ai_triage_queued: 'ai_triage_queued',
  ai_triage_running: 'ai_triage_running',
  ai_triage_done: 'ai_triage_done',
  free_scan_delivered: 'free_scan_delivered',
  waiting_payment: 'waiting_payment',
  paid: 'paid',
  ops_review: 'ops_review',
  need_more_docs: 'need_more_docs',
  reviewer_assigned: 'reviewer_assigned',
  reviewer_reviewing: 'reviewer_reviewing',
  senior_qc: 'senior_qc',
  final_draft_ready: 'final_draft_ready',
  delivered: 'delivered',
  outcome_pending: 'outcome_pending',
  closed: 'closed',
  escalated: 'escalated',
  cancelled: 'cancelled'
} as const;
export type CaseStatus = (typeof CaseStatus)[keyof typeof CaseStatus];

export const DocumentCategory = {
  sp2dk_letter: 'sp2dk_letter',
  coretax_screenshot: 'coretax_screenshot',
  efaktur_error_file: 'efaktur_error_file',
  invoice: 'invoice',
  tax_invoice_faktur_pajak: 'tax_invoice_faktur_pajak',
  withholding_slip_bukti_potong: 'withholding_slip_bukti_potong',
  bank_statement: 'bank_statement',
  spt: 'spt',
  marketplace_report: 'marketplace_report',
  contract_po: 'contract_po',
  identity_or_entity_document: 'identity_or_entity_document',
  other: 'other'
} as const;
export type DocumentCategory = (typeof DocumentCategory)[keyof typeof DocumentCategory];

export const DocumentStatus = {
  uploaded: 'uploaded',
  classified: 'classified',
  ocr_pending: 'ocr_pending',
  ocr_done: 'ocr_done',
  extraction_done: 'extraction_done',
  failed: 'failed',
  deleted: 'deleted'
} as const;
export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];

export const AiOutputType = {
  document_classification: 'document_classification',
  sp2dk_extraction: 'sp2dk_extraction',
  coretax_error_extraction: 'coretax_error_extraction',
  issue_summary: 'issue_summary',
  evidence_checklist: 'evidence_checklist',
  draft_response_letter: 'draft_response_letter',
  hallucination_check: 'hallucination_check',
  reviewer_brief: 'reviewer_brief'
} as const;
export type AiOutputType = (typeof AiOutputType)[keyof typeof AiOutputType];

export const ReviewType = {
  first_pass: 'first_pass',
  senior_qc: 'senior_qc',
  specialist: 'specialist',
  ops_completeness: 'ops_completeness'
} as const;
export type ReviewType = (typeof ReviewType)[keyof typeof ReviewType];

export const ReviewDecision = {
  approve: 'approve',
  request_changes: 'request_changes',
  request_more_docs: 'request_more_docs',
  escalate: 'escalate',
  reject: 'reject'
} as const;
export type ReviewDecision = (typeof ReviewDecision)[keyof typeof ReviewDecision];

export const OutcomeType = {
  accepted: 'accepted',
  request_more_docs: 'request_more_docs',
  partially_resolved: 'partially_resolved',
  unresolved: 'unresolved',
  escalated_to_consultation: 'escalated_to_consultation',
  audit_started: 'audit_started',
  unknown: 'unknown'
} as const;
export type OutcomeType = (typeof OutcomeType)[keyof typeof OutcomeType];

export type AppUser = {
  id: string;
  authProvider: string;
  authSubject: string | null;
  email: string;
  passwordHash: string | null;
  fullName: string | null;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  status: 'active' | 'suspended' | 'archived';
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

export type TenantMembershipRole = 'owner' | 'admin' | 'ops' | 'reviewer' | 'member';

export type TenantMembership = {
  id: string;
  tenantId: string;
  userId: string;
  role: TenantMembershipRole;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Case = {
  id: string;
  tenantId: string;
  ownerUserId: string;
  caseType: CaseType;
  status: CaseStatus;
  title: string | null;
  taxpayerType: string | null;
  taxpayerName: string | null;
  taxpayerNpwpHash: string | null;
  taxpayerNpwpEncrypted: Buffer | null;
  packageCode: string | null;
  sourceChannel: string | null;
  consentVersion: string | null;
  consentedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DocumentRow = {
  id: string;
  caseId: string;
  uploadedByUserId: string;
  category: DocumentCategory;
  originalFilename: string;
  storageBucket: string;
  storageKey: string;
  mimeType: string;
  fileSizeBytes: string | number;
  sha256Hash: string;
  pageCount: number | null;
  status: DocumentStatus;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

export type DocumentPageRow = {
  id: string;
  documentId: string;
  pageNumber: number;
  text: string | null;
  ocrConfidence: string | number | null;
  createdAt: Date;
};

export type JobRow = {
  id: string;
  tenantId: string | null;
  jobType: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  priority: number;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  lockedAt: Date | null;
  lockedBy: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DataSubjectRequestRow = {
  id: string;
  tenantId: string | null;
  requesterUserId: string;
  targetUserId: string;
  requestType: 'export' | 'delete';
  status: 'requested' | 'processing' | 'fulfilled' | 'failed';
  requestedAt: Date;
  fulfilledAt: Date | null;
  payload: Record<string, unknown>;
  errorMessage: string | null;
};
