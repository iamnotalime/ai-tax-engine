import { NextRequest } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { getRequestMeta } from '@/lib/http';
import { assertSameOrigin } from '@/lib/security';
import { auditLog } from '@/server/audit/audit';
import { requireRole } from '@/server/auth/session';
import { enqueueJob } from '@/server/jobs/queue';
import { requireTenantFromRequest } from '@/server/tenancy/context';

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const user = await requireRole(['admin']);
    const tenant = await requireTenantFromRequest(user, req);
    const job = await enqueueJob('retention_sweep', { requestedByUserId: user.id, tenantId: tenant.tenantId }, 5, tenant.tenantId);
    const requestMeta = getRequestMeta(req);
    await auditLog({
      actorUserId: user.id,
      action: 'retention_sweep.queued',
      resourceType: 'job',
      resourceId: job.id,
      tenantId: tenant.tenantId,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });
    return Response.json({ job }, { status: 202 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
