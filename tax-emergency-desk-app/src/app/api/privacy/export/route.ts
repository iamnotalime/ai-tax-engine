import { NextRequest } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { getRequestMeta } from '@/lib/http';
import { assertSameOrigin } from '@/lib/security';
import { auditLog } from '@/server/audit/audit';
import { requireUser } from '@/server/auth/session';
import { buildDataExport, recordFulfilledExport } from '@/server/privacy/data-subject';
import { assertRateLimit, RATE_LIMITS } from '@/server/rate-limit';
import { requireTenantFromRequest } from '@/server/tenancy/context';

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const tenant = await requireTenantFromRequest(user, req);
    await assertRateLimit(req, RATE_LIMITS.privacyExport, [tenant.tenantId, user.id]);
    const bundle = await buildDataExport(user, tenant.tenantId);
    const request = await recordFulfilledExport(user, tenant.tenantId, {
      caseCount: bundle.cases.length,
      documentCount: bundle.documents.length,
      aiOutputCount: bundle.aiOutputs.length
    });
    const requestMeta = getRequestMeta(req);
    await auditLog({
      actorUserId: user.id,
      action: 'data.exported',
      resourceType: 'data_subject_request',
      resourceId: request.id,
      tenantId: tenant.tenantId,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
      payload: { caseCount: bundle.cases.length, documentCount: bundle.documents.length }
    });
    return Response.json({ request, export: bundle });
  } catch (error) {
    return toErrorResponse(error);
  }
}
