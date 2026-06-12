import { NextRequest } from 'next/server';

export function getClientIp(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null;
}

export function getRequestMeta(req: NextRequest) {
  return {
    ipAddress: getClientIp(req),
    userAgent: req.headers.get('user-agent') ?? null
  };
}
