import { jsonb, sql } from '@/lib/db';
import { AiOutputType, CaseType, type Case, type DocumentPageRow, type DocumentRow } from '@/server/db/types';
import { assertNoGuaranteeLanguage } from './guardrails';
import {
  PROMPT_VERSION,
  coretaxErrorPrompt,
  documentClassificationPrompt,
  draftResponsePrompt,
  evidenceChecklistPrompt,
  sp2dkExtractionPrompt,
  supportCheckPrompt
} from './prompts';
import {
  coretaxErrorExtractionSchema,
  documentClassificationSchema,
  draftResponseSchema,
  evidenceChecklistSchema,
  sp2dkExtractionSchema,
  supportCheckSchema
} from './schemas/tax-workflow';
import type { DocumentClassificationOutput } from './schemas/tax-workflow';
import { renderRetrievedContext, retrieveTaxKnowledge } from './rag/retriever';
import { runStructuredAi } from './run';
import { REVIEWED_PACK_DISCLAIMER } from '@/lib/constants';
import { redactSensitiveText } from '@/server/privacy/redaction';

function jsonText(value: unknown) {
  return JSON.stringify(value, null, 2);
}

async function getCaseSourceExtracts(caseId: string) {
  const pages = await sql<Array<DocumentPageRow & { filename: string }>>`
    select p.*, d.original_filename as filename
    from document_pages p
    join documents d on d.id = p.document_id
    where d.case_id = ${caseId}
    order by p.page_number asc
  `;
  return pages.map((page) => ({ document_id: page.documentId, filename: page.filename, page_number: page.pageNumber, text: redactSensitiveText(page.text?.slice(0, 2500) ?? '') }));
}

async function getCaseWithDocuments(caseId: string, tenantId?: string) {
  const [baseCase] = await sql<Case[]>`
    select *
    from cases
    where id = ${caseId}
      ${tenantId ? sql`and tenant_id = ${tenantId}` : sql``}
    limit 1
  `;
  if (!baseCase) return null;
  const documents = await sql<DocumentRow[]>`select * from documents where case_id = ${caseId} order by created_at asc`;
  const documentIds = documents.map((doc) => doc.id);
  const pages = documentIds.length ? await sql<DocumentPageRow[]>`select * from document_pages where document_id in ${sql(documentIds)} order by page_number asc` : [];
  return {
    ...baseCase,
    documents: documents.map((doc) => ({ ...doc, pages: pages.filter((page) => page.documentId === doc.id) }))
  };
}

export async function runTaxTriageWorkflow(caseId: string, tenantId?: string) {
  const kase = await getCaseWithDocuments(caseId, tenantId);
  if (!kase) throw new Error('Case not found');

  await sql.begin(async (tx) => {
    await tx`update cases set status = 'ai_triage_running', updated_at = now() where id = ${caseId}`;
    await tx`
      insert into case_events (case_id, event_type, from_status, to_status, payload)
      values (${caseId}, 'ai.workflow_started', ${kase.status}, 'ai_triage_running', ${jsonb({})})
    `;
  });

  const classifications: DocumentClassificationOutput[] = [];
  for (const doc of kase.documents) {
    const text = redactSensitiveText(doc.pages.map((p) => p.text ?? '').join('\n\n'));
    const result = await runStructuredAi({
      caseId,
      tenantId: kase.tenantId,
      documentId: doc.id,
      runType: 'document_classification',
      promptVersion: PROMPT_VERSION.documentClassification,
      outputType: AiOutputType.document_classification,
      schemaName: 'DocumentClassificationOutput',
      schema: documentClassificationSchema,
      ...documentClassificationPrompt(doc.id, text),
      visibleToUser: true
    });
    classifications.push(result.data);
    await sql.begin(async (tx) => {
      await tx`
        update documents
        set category = ${result.data.category}, status = 'classified', updated_at = now()
        where id = ${doc.id}
      `;
      await tx`
        insert into document_extractions (
          document_id,
          extraction_type,
          schema_version,
          extracted_json,
          confidence,
          source_refs,
          created_by_ai_run_id
        )
        values (
          ${doc.id},
          'document_classification',
          'v1',
          ${jsonb(result.data)},
          ${result.data.confidence},
          ${jsonb(result.data.source_refs)},
          ${result.aiRun.id}
        )
      `;
    });
  }

  const primaryDoc = kase.documents.find((doc) => classifications.find((c) => c.document_id === doc.id)?.category === 'sp2dk_letter') ?? kase.documents[0];
  const primaryText = redactSensitiveText(primaryDoc?.pages.map((p) => p.text ?? '').join('\n\n') ?? '');
  const retrieved = renderRetrievedContext(await retrieveTaxKnowledge(`${kase.caseType} ${primaryText.slice(0, 800)}`, 'tax_id', 6, kase.tenantId));

  let caseSummary: unknown;
  if (kase.caseType === CaseType.sp2dk_response) {
    const extraction = await runStructuredAi({
      caseId,
      tenantId: kase.tenantId,
      documentId: primaryDoc?.id,
      runType: 'sp2dk_extraction',
      promptVersion: PROMPT_VERSION.sp2dkExtraction,
      outputType: AiOutputType.sp2dk_extraction,
      schemaName: 'Sp2dkExtractionOutput',
      schema: sp2dkExtractionSchema,
      ...sp2dkExtractionPrompt(primaryDoc?.id ?? 'unknown_doc', primaryText),
      visibleToUser: true
    });
    caseSummary = extraction.data;
    for (const issue of extraction.data.issues) {
      await sql`
        insert into tax_issues (
          case_id,
          issue_code,
          title,
          description,
          tax_type,
          period,
          severity,
          confidence,
          source_refs
        )
        values (
          ${caseId},
          ${issue.issue_code},
          ${issue.title},
          ${issue.description},
          ${issue.tax_type ?? null},
          ${issue.period ?? null},
          ${issue.severity},
          ${issue.confidence},
          ${jsonb(issue.source_refs)}
        )
      `;
    }
  } else {
    const extraction = await runStructuredAi({
      caseId,
      tenantId: kase.tenantId,
      documentId: primaryDoc?.id,
      runType: 'coretax_error_extraction',
      promptVersion: PROMPT_VERSION.coretaxError,
      outputType: AiOutputType.coretax_error_extraction,
      schemaName: 'CoretaxErrorExtractionOutput',
      schema: coretaxErrorExtractionSchema,
      ...coretaxErrorPrompt(primaryDoc?.id ?? 'unknown_doc', primaryText),
      visibleToUser: true
    });
    caseSummary = extraction.data;
  }

  const availableDocuments = classifications.map((classification) => ({
    document_id: classification.document_id,
    category: classification.category,
    summary: classification.summary,
    confidence: classification.confidence
  }));

  const evidence = await runStructuredAi({
    caseId,
    tenantId: kase.tenantId,
    runType: 'evidence_checklist',
    promptVersion: PROMPT_VERSION.evidenceChecklist,
    outputType: AiOutputType.evidence_checklist,
    schemaName: 'EvidenceChecklistOutput',
    schema: evidenceChecklistSchema,
    ...evidenceChecklistPrompt(caseSummary, availableDocuments, retrieved),
    visibleToUser: true
  });

  for (const item of evidence.data.items) {
    await sql`
      insert into evidence_items (
        case_id,
        label,
        description,
        required,
        status,
        source_refs,
        reviewer_notes
      )
      values (
        ${caseId},
        ${item.label},
        ${item.description},
        ${item.required},
        ${item.status},
        ${jsonb(item.source_refs)},
        ${item.reason}
      )
    `;
  }

  const draft = await runStructuredAi({
    caseId,
    tenantId: kase.tenantId,
    runType: 'draft_response',
    promptVersion: PROMPT_VERSION.draftResponse,
    outputType: AiOutputType.draft_response_letter,
    schemaName: 'DraftResponseOutput',
    schema: draftResponseSchema,
    ...draftResponsePrompt(caseSummary, evidence.data, null, retrieved),
    visibleToUser: false
  });
  assertNoGuaranteeLanguage(jsonText(draft.data));

  const support = await runStructuredAi({
    caseId,
    tenantId: kase.tenantId,
    runType: 'support_check',
    promptVersion: PROMPT_VERSION.supportCheck,
    outputType: AiOutputType.hallucination_check,
    schemaName: 'SupportCheckOutput',
    schema: supportCheckSchema,
    ...supportCheckPrompt(draft.data, evidence.data, await getCaseSourceExtracts(caseId)),
    visibleToUser: false
  });

  const markdown = buildDeliverableMarkdown({ caseId, caseSummary, evidence: evidence.data, draft: draft.data, support: support.data });
  const deliverable = await sql.begin(async (tx) => {
    const [createdDeliverable] = await tx<Array<{ id: string }>>`
      insert into deliverables (case_id, deliverable_type, status)
      values (${caseId}, ${kase.caseType === CaseType.sp2dk_response ? 'response_pack' : 'error_resolution_pack'}, 'draft')
      returning id
    `;
    const [createdVersion] = await tx<Array<{ id: string }>>`
      insert into deliverable_versions (deliverable_id, version_number, content_markdown, generated_by_ai_run_id)
      values (${createdDeliverable.id}, 1, ${markdown}, ${draft.aiRun.id})
      returning id
    `;
    await tx`update deliverables set current_version_id = ${createdVersion.id}, updated_at = now() where id = ${createdDeliverable.id}`;
    await tx`update cases set status = 'ai_triage_done', updated_at = now() where id = ${caseId}`;
    await tx`
      insert into case_events (case_id, event_type, from_status, to_status, payload)
      values (${caseId}, 'ai.workflow_completed', 'ai_triage_running', 'ai_triage_done', ${jsonb({ supportCheck: support.data })})
    `;
    return createdDeliverable;
  });
  return { classifications, caseSummary, evidence: evidence.data, draft: draft.data, support: support.data, deliverableId: deliverable.id };
}

function buildDeliverableMarkdown(params: { caseId: string; caseSummary: unknown; evidence: unknown; draft: { title: string; recipient: string | null; sections: Array<{ heading: string; body: string }>; attachments: string[]; risk_notes?: string[] }; support: unknown }) {
  const sections = params.draft.sections.map((section, index) => `## ${index + 1}. ${section.heading}\n\n${section.body}`).join('\n\n');
  return `# ${params.draft.title}\n\nCase ID: ${params.caseId}\n\n> ${REVIEWED_PACK_DISCLAIMER}\n\n## Ringkasan Terstruktur\n\n\`\`\`json\n${JSON.stringify(params.caseSummary, null, 2)}\n\`\`\`\n\n${sections}\n\n## Lampiran yang Disarankan\n\n${params.draft.attachments.map((a) => `- ${a}`).join('\n')}\n\n## Catatan Risiko\n\n${(params.draft.risk_notes ?? []).map((n) => `- ${n}`).join('\n')}\n\n## Evidence Matrix\n\n\`\`\`json\n${JSON.stringify(params.evidence, null, 2)}\n\`\`\`\n\n## Support Check\n\n\`\`\`json\n${JSON.stringify(params.support, null, 2)}\n\`\`\`\n`;
}
