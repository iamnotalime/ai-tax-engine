import { NextRequest } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db';
import { getRequestMeta } from '@/lib/http';
import { assertSameOrigin } from '@/lib/security';
import { AppError, toErrorResponse } from '@/lib/errors';
import { auditLog } from '@/server/audit/audit';
import { assertCanAccessCase } from '@/server/auth/authorization';
import { requireRole } from '@/server/auth/session';
import { transitionCase } from '@/server/cases/service';
import { CaseStatus, type Case } from '@/server/db/types';

const schema = z.object({ toStatus: z.nativeEnum(CaseStatus), reason: z.string().max(500).optional() });

export async function POST(req: NextRequest, ctx: { params: Promise<{ caseId: string }> }) {
  try {
    assertSameOrigin(req);
    const user = await requireRole(['ops', 'licensed_tax_consultant', 'admin']);
    const { caseId } = await ctx.params;
    const input = schema.parse(await req.json());
    const [existingCase] = await sql<Case[]>`select * from cases where id = ${caseId} limit 1`;
    if (!existingCase) throw new AppError('NOT_FOUND', 'Kasus tidak ditemukan.', 404);
    await assertCanAccessCase(user, existingCase);
    const kase = await transitionCase({ caseId, tenantId: existingCase.tenantId, toStatus: input.toStatus, actorUserId: user.id, reason: input.reason });
    const requestMeta = getRequestMeta(req);
    await auditLog({
      actorUserId: user.id,
      action: 'admin.case_transition',
      resourceType: 'case',
      resourceId: caseId,
      tenantId: existingCase.tenantId,
      caseId,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
      payload: { toStatus: input.toStatus, reason: input.reason ?? null }
    });
    return Response.json({ case: kase });
  } catch (error) {
    return toErrorResponse(error);
  }
}
