import { NextRequest } from 'next/server';
import { env } from '@/config/env';
import { AppError } from './errors';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

function isLoopbackAliasAllowed(origin: string, expectedUrl: URL) {
  if (env.APP_ENV === 'production') return false;
  if (!LOOPBACK_HOSTS.has(expectedUrl.hostname)) return false;

  try {
    const originUrl = new URL(origin);
    return (
      LOOPBACK_HOSTS.has(originUrl.hostname) &&
      originUrl.protocol === expectedUrl.protocol &&
      originUrl.port === expectedUrl.port
    );
  } catch {
    return false;
  }
}

function isLocalRequestOrigin(origin: string, req: NextRequest) {
  if (env.APP_ENV === 'production') return false;
  try {
    return origin === new URL(req.url).origin;
  } catch {
    return false;
  }
}

function isLocalDevelopmentOrigin(origin: string, expectedUrl: URL) {
  if (env.APP_ENV === 'production') return false;
  try {
    const originUrl = new URL(origin);
    return originUrl.protocol === expectedUrl.protocol && originUrl.port === expectedUrl.port;
  } catch {
    return false;
  }
}

export function assertSameOrigin(req: NextRequest) {
  if (!MUTATING_METHODS.has(req.method)) return;

  const origin = req.headers.get('origin');
  const expectedUrl = new URL(env.NEXT_PUBLIC_APP_URL);
  const expected = expectedUrl.origin;
  if (
    !origin ||
    (origin !== expected &&
      !isLoopbackAliasAllowed(origin, expectedUrl) &&
      !isLocalRequestOrigin(origin, req) &&
      !isLocalDevelopmentOrigin(origin, expectedUrl))
  ) {
    throw new AppError('UNTRUSTED_ORIGIN', 'Origin request tidak dipercaya.', 403);
  }

  const fetchSite = req.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin') {
    throw new AppError('UNTRUSTED_FETCH_SITE', 'Konteks request tidak dipercaya.', 403);
  }
}
