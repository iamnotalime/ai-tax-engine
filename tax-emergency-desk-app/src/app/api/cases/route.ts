import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { toErrorResponse } from '@/lib/errors';
import { getRequestMeta } from '@/lib/http';
import { assertSameOrigin } from '@/lib/security';
import { auditLog } from '@/server/audit/audit';
import { requireUser } from '@/server/auth/session';
import { createCase, createCaseSchema } from '@/server/cases/service';
import { assertRateLimit, RATE_LIMITS } from '@/server/rate-limit';
import { requireTenantFromRequest } from '@/server/tenancy/context';
import type { Case, DocumentRow } from '@/server/db/types';

type CaseListItem = Case & {
  documents: DocumentRow[];
  deliverables: Array<Record<string, unknown> & { versions: Record<string, unknown>[] }>;
};

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const tenant = await requireTenantFromRequest(user, req);
    const requestMeta = getRequestMeta(req);
    const internal = ['support', 'ops', 'tax_associate', 'licensed_tax_consultant', 'admin'].includes(user.role);
    const cases = internal
      ? await sql<Case[]>`select * from cases where tenant_id = ${tenant.tenantId} order by created_at desc limit 100`
      : await sql<Case[]>`select * from cases where tenant_id = ${tenant.tenantId} and owner_user_id = ${user.id} order by created_at desc limit 100`;
    const caseIds = cases.map((kase) => kase.id);
    const documents = caseIds.length ? await sql<DocumentRow[]>`select * from documents where case_id in ${sql(caseIds)}` : [];
    const deliverables = caseIds.length
      ? await sql<Array<Record<string, unknown> & { caseId: string; versions: Record<string, unknown>[] }>>`
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
          where d.case_id in ${sql(caseIds)}
          group by d.id
        `
      : [];
    const casesWithRelations: CaseListItem[] = cases.map((kase) => ({
      ...kase,
      documents: documents.filter((doc) => doc.caseId === kase.id),
      deliverables: deliverables.filter((deliverable) => deliverable.caseId === kase.id)
    }));
    await auditLog({
      actorUserId: user.id,
      action: 'case.list',
      resourceType: 'case',
      tenantId: tenant.tenantId,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
      payload: { scope: internal ? 'tenant_internal' : 'tenant_owner', tenantSlug: tenant.tenantSlug, resultCount: casesWithRelations.length }
    });
    return Response.json({ cases: casesWithRelations });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const tenant = await requireTenantFromRequest(user, req);
    await assertRateLimit(req, RATE_LIMITS.caseCreate, [tenant.tenantId, user.id]);
    const requestMeta = getRequestMeta(req);
    const input = createCaseSchema.parse(await req.json());
    const kase = await createCase(user, input, tenant.tenantId);
    await auditLog({
      actorUserId: user.id,
      action: 'case.create',
      resourceType: 'case',
      resourceId: kase.id,
      tenantId: tenant.tenantId,
      caseId: kase.id,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
      payload: { caseType: kase.caseType, packageCode: kase.packageCode }
    });
    return Response.json({ case: kase }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
