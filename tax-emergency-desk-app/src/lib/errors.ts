import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
    public readonly details: Record<string, unknown> = {}
  ) {
    super(message);
  }
}

export function toErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return Response.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      { status: error.status }
    );
  }
  if (error instanceof ZodError) {
    return Response.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Input tidak valid.',
          details: { issues: error.issues }
        }
      },
      { status: 400 }
    );
  }
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
    return Response.json(
      {
        error: {
          code: 'CONFLICT',
          message: 'Data sudah digunakan.',
          details: {}
        }
      },
      { status: 409 }
    );
  }
  return Response.json(
    { error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem.', details: {} } },
    { status: 500 }
  );
}
