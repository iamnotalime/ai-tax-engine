import { NextRequest } from 'next/server';
import { z } from 'zod';
import { AppError, toErrorResponse } from '@/lib/errors';
import { sha256 } from '@/lib/crypto';
import { sql } from '@/lib/db';
import { getRequestMeta } from '@/lib/http';
import { assertSameOrigin } from '@/lib/security';
import { verifyPassword } from '@/server/auth/password';
import { createSessionCookie } from '@/server/auth/session';
import { auditLog } from '@/server/audit/audit';
import { assertRateLimit, RATE_LIMITS } from '@/server/rate-limit';
import type { AppUser } from '@/server/db/types';

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

async function parseLoginInput(req: NextRequest) {
  const contentType = req.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) return { input: schema.parse(await req.json()), htmlFormPost: false };
  const formData = await req.formData();
  return {
    input: schema.parse({
      email: formData.get('email'),
      password: formData.get('password')
    }),
    htmlFormPost: true
  };
}

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await assertRateLimit(req, RATE_LIMITS.authIp);
    const requestMeta = getRequestMeta(req);
    const { input, htmlFormPost } = await parseLoginInput(req);
    const email = input.email.toLowerCase();
    await assertRateLimit(req, RATE_LIMITS.authIdentity, [email]);
    const [user] = await sql<AppUser[]>`select * from app_users where email = ${email} limit 1`;
    if (!user?.passwordHash || !user.isActive || !(await verifyPassword(input.password, user.passwordHash))) {
      await auditLog({
        action: 'auth.login_failed',
        resourceType: 'auth_session',
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent,
        payload: { emailHash: sha256(email) }
      });
      throw new AppError('INVALID_CREDENTIALS', 'Email atau password salah.', 401);
    }
    await createSessionCookie({ sub: user.id, email: user.email, role: user.role });
    await auditLog({
      actorUserId: user.id,
      action: 'auth.login_succeeded',
      resourceType: 'auth_session',
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });
    if (htmlFormPost) return Response.redirect(new URL('/dashboard', req.url), 303);
    return Response.json({ user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
