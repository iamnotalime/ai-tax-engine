import { NextRequest } from 'next/server';
import { env } from '@/config/env';
import { AppError } from './errors';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function assertSameOrigin(req: NextRequest) {
  if (!MUTATING_METHODS.has(req.method)) return;

  const origin = req.headers.get('origin');
  if (!origin) return;

  const expected = new URL(env.NEXT_PUBLIC_APP_URL).origin;
  if (origin !== expected) {
    throw new AppError('UNTRUSTED_ORIGIN', 'Origin request tidak dipercaya.', 403);
  }
}
