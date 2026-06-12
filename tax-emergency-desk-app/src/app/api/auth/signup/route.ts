import { NextRequest } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db';
import { getRequestMeta } from '@/lib/http';
import { assertSameOrigin } from '@/lib/security';
import { toErrorResponse } from '@/lib/errors';
import { hashPassword } from '@/server/auth/password';
import { createSessionCookie } from '@/server/auth/session';
import { auditLog } from '@/server/audit/audit';
import { assertRateLimit, RATE_LIMITS } from '@/server/rate-limit';
import { createTenantForUser } from '@/server/tenancy/context';
import type { AppUser } from '@/server/db/types';

const schema = z.object({ email: z.string().email(), password: z.string().min(10), fullName: z.string().min(2).max(120) });

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await assertRateLimit(req, RATE_LIMITS.signupIp);
    const requestMeta = getRequestMeta(req);
    const input = schema.parse(await req.json());
    const email = input.email.toLowerCase();
    await assertRateLimit(req, RATE_LIMITS.authIdentity, [email]);
    const passwordHash = await hashPassword(input.password);
    const [user] = await sql<AppUser[]>`
      insert into app_users (email, full_name, password_hash)
      values (${email}, ${input.fullName}, ${passwordHash})
      returning *
    `;
    const tenant = await createTenantForUser(user);
    await createSessionCookie({ sub: user.id, email: user.email, role: user.role });
    await auditLog({
      actorUserId: user.id,
      action: 'auth.signup_succeeded',
      resourceType: 'app_user',
      resourceId: user.id,
      tenantId: tenant.tenantId,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });
    return Response.json({ user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
