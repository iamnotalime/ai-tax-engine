import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { env } from '@/config/env';
import { sql } from '@/lib/db';
import { AppError } from '@/lib/errors';
import type { AppUser } from '@/server/db/types';

const secret = new TextEncoder().encode(env.AUTH_SECRET);

type SessionClaims = {
  sub: string;
  email: string;
  role: string;
};

export async function createSessionCookie(claims: SessionClaims) {
  const token = await new SignJWT({ email: claims.email, role: claims.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
  const jar = await cookies();
  jar.set(env.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(env.SESSION_COOKIE_NAME);
}

export async function getSessionUser() {
  const jar = await cookies();
  const token = jar.get(env.SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const verified = await jwtVerify(token, secret);
    const userId = verified.payload.sub;
    if (!userId) return null;
    const [user] = await sql<AppUser[]>`
      select *
      from app_users
      where id = ${userId} and is_active = true
      limit 1
    `;
    return user ?? null;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new AppError('UNAUTHORIZED', 'Silakan login terlebih dahulu.', 401);
  return user;
}

export async function requireRole(roles: string[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new AppError('FORBIDDEN', 'Anda tidak memiliki akses.', 403);
  return user;
}
