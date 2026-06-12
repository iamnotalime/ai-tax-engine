import { NextRequest } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { getRequestMeta } from '@/lib/http';
import { assertSameOrigin } from '@/lib/security';
import { auditLog } from '@/server/audit/audit';
import { clearSessionCookie, getSessionUser } from '@/server/auth/session';

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const user = await getSessionUser();
    const requestMeta = getRequestMeta(req);
    if (user) {
      await auditLog({
        actorUserId: user.id,
        action: 'auth.logout',
        resourceType: 'auth_session',
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent
      });
    }
    await clearSessionCookie();
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
