import { NextRequest } from 'next/server';
import { z } from 'zod';
import { jsonb, sql } from '@/lib/db';
import { AppError, toErrorResponse } from '@/lib/errors';
import { getRequestMeta } from '@/lib/http';
import { assertSameOrigin } from '@/lib/security';
import { auditLog } from '@/server/audit/audit';
import { requireUser } from '@/server/auth/session';
import { assertCanAccessCase } from '@/server/auth/authorization';
import { OutcomeType, type Case } from '@/server/db/types';

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
      await tx`update cases set status = 'closed', closed_at = now(), updated_at = now() where id = ${caseId}`;
      await tx`
        insert into case_events (case_id, event_type, from_status, to_status, actor_user_id, payload)
        values (${caseId}, 'case.outcome_reported', ${kase.status}, 'closed', ${user.id}, ${jsonb({ outcomeId: rows[0].id })})
      `;
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
