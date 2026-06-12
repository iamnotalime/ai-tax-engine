import { NextRequest } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { getRequestMeta } from '@/lib/http';
import { assertSameOrigin } from '@/lib/security';
import { auditLog } from '@/server/audit/audit';
import { requireUser } from '@/server/auth/session';
import { requestDataDeletion } from '@/server/privacy/data-subject';
import { assertRateLimit, RATE_LIMITS } from '@/server/rate-limit';
import { requireTenantFromRequest } from '@/server/tenancy/context';

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const tenant = await requireTenantFromRequest(user, req);
    await assertRateLimit(req, RATE_LIMITS.privacyDelete, [tenant.tenantId, user.id]);
    const request = await requestDataDeletion(user, tenant.tenantId);
    const requestMeta = getRequestMeta(req);
    await auditLog({
      actorUserId: user.id,
      action: 'data.deletion_requested',
      resourceType: 'data_subject_request',
      resourceId: request.id,
      tenantId: tenant.tenantId,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });
    return Response.json({ request }, { status: 202 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
