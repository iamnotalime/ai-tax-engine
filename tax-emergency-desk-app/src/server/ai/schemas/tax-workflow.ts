import { z } from 'zod';

export const sourceRefSchema = z.object({
  document_id: z.string(),
  page_number: z.number().nullable().optional(),
  field: z.string(),
  quote: z.string().max(500).optional(),
  confidence: z.number().min(0).max(1).optional()
});

export const documentClassificationSchema = z.object({
  document_id: z.string(),
  category: z.enum([
    'sp2dk_letter',
    'coretax_screenshot',
    'efaktur_error_file',
    'invoice',
    'tax_invoice_faktur_pajak',
    'withholding_slip_bukti_potong',
    'bank_statement',
    'spt',
    'marketplace_report',
    'contract_po',
    'identity_or_entity_document',
    'other'
  ]),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  detected_fields: z.record(z.unknown()).default({}),
  missing_information: z.array(z.string()).default([]),
  source_refs: z.array(sourceRefSchema).default([])
});

export const sp2dkExtractionSchema = z.object({
  letter: z.object({
    letter_number: z.string().nullable().optional(),
    letter_date: z.string().nullable().optional(),
    received_date: z.string().nullable().optional(),
    kpp_name: z.string().nullable().optional(),
    taxpayer_name: z.string().nullable().optional(),
    taxpayer_npwp_visible: z.string().nullable().optional(),
    deadline_date: z.string().nullable().optional(),
    deadline_basis: z.string().nullable().optional()
  }),
  issues: z.array(
    z.object({
      issue_code: z.string(),
      title: z.string(),
      description: z.string(),
      tax_type: z.string().nullable().optional(),
      period: z.string().nullable().optional(),
      amount_visible: z.number().nullable().optional(),
      severity: z.enum(['unknown', 'low', 'medium', 'high', 'critical']),
      confidence: z.number().min(0).max(1),
      source_refs: z.array(sourceRefSchema).default([])
    })
  ),
  requested_documents: z.array(z.string()).default([]),
  missing_information: z.array(z.string()).default([]),
  source_refs: z.array(sourceRefSchema).default([])
});

export const coretaxErrorExtractionSchema = z.object({
  error_type: z.string(),
  visible_error_message: z.string().nullable(),
  module: z.string().nullable(),
  likely_causes: z.array(z.string()),
  checklist: z.array(z.string()),
  review_required: z.boolean(),
  source_refs: z.array(sourceRefSchema).default([])
});

export const evidenceChecklistSchema = z.object({
  overall_completeness: z.enum(['low', 'medium', 'high', 'unknown']),
  items: z.array(
    z.object({
      label: z.string(),
      description: z.string(),
      required: z.boolean(),
      status: z.enum(['missing', 'uploaded', 'insufficient', 'accepted', 'not_applicable']),
      reason: z.string(),
      related_issue_code: z.string().nullable().optional(),
      source_refs: z.array(sourceRefSchema).default([])
    })
  ),
  notes: z.array(z.string()).default([])
});

export const draftResponseSchema = z.object({
  title: z.string(),
  recipient: z.string().nullable(),
  sections: z.array(
    z.object({
      heading: z.string(),
      body: z.string(),
      source_refs: z.array(sourceRefSchema).default([])
    })
  ),
  attachments: z.array(z.string()).default([]),
  review_required: z.boolean(),
  risk_notes: z.array(z.string()).default([]),
  unsupported_claims: z.array(z.string()).default([])
});

export const supportCheckSchema = z.object({
  supported: z.boolean(),
  unsupported_claims: z.array(z.string()).default([]),
  risky_language: z.array(z.string()).default([]),
  suggested_edits: z.array(z.string()).default([])
});

export type DocumentClassificationOutput = z.infer<typeof documentClassificationSchema>;
export type Sp2dkExtractionOutput = z.infer<typeof sp2dkExtractionSchema>;
export type CoretaxErrorExtractionOutput = z.infer<typeof coretaxErrorExtractionSchema>;
export type EvidenceChecklistOutput = z.infer<typeof evidenceChecklistSchema>;
export type DraftResponseOutput = z.infer<typeof draftResponseSchema>;
export type SupportCheckOutput = z.infer<typeof supportCheckSchema>;
