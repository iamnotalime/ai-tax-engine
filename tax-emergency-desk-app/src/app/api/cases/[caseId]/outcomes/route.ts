import { NextRequest } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db';
import { AppError, toErrorResponse } from '@/lib/errors';
import { getRequestMeta } from '@/lib/http';
import { assertSameOrigin } from '@/lib/security';
import { auditLog } from '@/server/audit/audit';
import { requireUser } from '@/server/auth/session';
import { assertCanAccessCase } from '@/server/auth/authorization';
import { transitionCaseStatus } from '@/server/cases/service';
import { CaseStatus, OutcomeType, type Case } from '@/server/db/types';

const schema = z.object({ outcomeType: z.nativeEnum(OutcomeType), outcomeDate: z.string().optional(), notes: z.string().max(4000).optional() });

export async function POST(req: NextRequest, ctx: { params: Promise<{ caseId: string }> }) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const { caseId } = await ctx.params;
    const input = schema.parse(await req.json());
    const [kase] = await sql<Case[]>`select * from cases where id = ${caseId} limit 1`;
    if (!kase) throw new AppError('NOT_FOUND', 'Kasus tidak ditemukan.', 404);
    await assertCanAccessCase(user, kase);
    const [outcome] = await sql.begin(async (tx) => {
      const rows = await tx<Record<string, unknown>[]>`
        insert into case_outcomes (case_id, reported_by_user_id, outcome_type, outcome_date, notes)
        values (${caseId}, ${user.id}, ${input.outcomeType}, ${input.outcomeDate ?? null}, ${input.notes ?? null})
        returning *
      `;
      await transitionCaseStatus(tx, {
        caseId,
        fromStatus: kase.status,
        toStatus: CaseStatus.closed,
        actorUserId: user.id,
        eventType: 'case.outcome_reported',
        payload: { outcomeId: rows[0].id },
        closeCase: true
      });
      return rows;
    });
    const requestMeta = getRequestMeta(req);
    await auditLog({
      actorUserId: user.id,
      action: 'case.outcome_report',
      resourceType: 'case_outcome',
      resourceId: String(outcome.id),
      tenantId: kase.tenantId,
      caseId,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
      payload: { outcomeType: input.outcomeType }
    });
    return Response.json({ outcome }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
