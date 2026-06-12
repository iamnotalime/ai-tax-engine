import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { AppError, toErrorResponse } from '@/lib/errors';
import { getRequestMeta } from '@/lib/http';
import { auditLog } from '@/server/audit/audit';
import { requireUser } from '@/server/auth/session';
import { assertCanAccessCase } from '@/server/auth/authorization';
import type { Case, DocumentPageRow, DocumentRow } from '@/server/db/types';

export async function GET(req: NextRequest, ctx: { params: Promise<{ caseId: string }> }) {
  try {
    const user = await requireUser();
    const { caseId } = await ctx.params;
    const [baseCase] = await sql<Case[]>`select * from cases where id = ${caseId} limit 1`;
    if (!baseCase) throw new AppError('NOT_FOUND', 'Kasus tidak ditemukan.', 404);
    await assertCanAccessCase(user, baseCase);
    const documents = await sql<DocumentRow[]>`select * from documents where case_id = ${caseId} order by created_at asc`;
    const documentIds = documents.map((doc) => doc.id);
    const pages = documentIds.length ? await sql<DocumentPageRow[]>`select * from document_pages where document_id in ${sql(documentIds)} order by page_number asc` : [];
    const extractions = documentIds.length ? await sql<Record<string, unknown>[]>`select * from document_extractions where document_id in ${sql(documentIds)} order by created_at desc` : [];
    const [taxIssues, evidenceItems, aiOutputs, deliverables, events, reviews] = await Promise.all([
      sql<Record<string, unknown>[]>`select * from tax_issues where case_id = ${caseId} order by created_at asc`,
      sql<Record<string, unknown>[]>`select * from evidence_items where case_id = ${caseId} order by created_at asc`,
      sql<Record<string, unknown>[]>`select * from ai_outputs where case_id = ${caseId} order by created_at desc`,
      sql<Array<Record<string, unknown> & { versions: Record<string, unknown>[] }>>`
        select
          d.*,
          coalesce(
            jsonb_agg(
              jsonb_build_object(
                'id', v.id,
                'versionNumber', v.version_number,
                'contentMarkdown', v.content_markdown,
                'contentHtml', v.content_html,
                'storageKey', v.storage_key,
                'createdAt', v.created_at
              )
              order by v.version_number desc
            ) filter (where v.id is not null),
            '[]'::jsonb
          ) as versions
        from deliverables d
        left join deliverable_versions v on v.deliverable_id = d.id
        where d.case_id = ${caseId}
        group by d.id
        order by d.created_at desc
      `,
      sql<Record<string, unknown>[]>`select * from case_events where case_id = ${caseId} order by created_at desc limit 20`,
      sql<Record<string, unknown>[]>`select * from reviews where case_id = ${caseId} order by created_at desc`
    ]);
    const kase = baseCase
      ? {
          ...baseCase,
          documents: documents.map((doc) => ({
            ...doc,
            pages: pages.filter((page) => page.documentId === doc.id),
            extractions: extractions.filter((extraction) => extraction.documentId === doc.id)
          })),
          taxIssues,
          evidenceItems,
          aiOutputs,
          deliverables,
          events,
          reviews
        }
      : null;
    const requestMeta = getRequestMeta(req);
    await auditLog({
      actorUserId: user.id,
      action: 'case.view',
      resourceType: 'case',
      resourceId: caseId,
      tenantId: baseCase.tenantId,
      caseId,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });
    return Response.json({ case: kase });
  } catch (error) {
    return toErrorResponse(error);
  }
}
