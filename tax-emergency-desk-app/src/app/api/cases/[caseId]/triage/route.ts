import { NextRequest } from 'next/server';
import { jsonb, sql } from '@/lib/db';
import { AppError, toErrorResponse } from '@/lib/errors';
import { getRequestMeta } from '@/lib/http';
import { assertSameOrigin } from '@/lib/security';
import { auditLog } from '@/server/audit/audit';
import { requireUser } from '@/server/auth/session';
import { assertCanAccessCase } from '@/server/auth/authorization';
import type { Case } from '@/server/db/types';
import { enqueueTaxTriage } from '@/server/jobs/enqueue';
import { assertRateLimit, RATE_LIMITS } from '@/server/rate-limit';

export async function POST(req: NextRequest, ctx: { params: Promise<{ caseId: string }> }) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const { caseId } = await ctx.params;
    const [kase] = await sql<Case[]>`select * from cases where id = ${caseId} limit 1`;
    if (!kase) throw new AppError('NOT_FOUND', 'Kasus tidak ditemukan.', 404);
    await assertCanAccessCase(user, kase);
    await assertRateLimit(req, RATE_LIMITS.triageCase, [kase.tenantId, user.id, caseId]);
    const [{ count }] = await sql<Array<{ count: number }>>`select count(*)::int as count from documents where case_id = ${caseId}`;
    if (!count) throw new AppError('NO_DOCUMENTS', 'Unggah dokumen terlebih dahulu.', 400);
    const job = await enqueueTaxTriage({ caseId, tenantId: kase.tenantId, requestedByUserId: user.id });
    await sql.begin(async (tx) => {
      await tx`update cases set status = 'ai_triage_queued', updated_at = now() where id = ${caseId}`;
      await tx`
        insert into case_events (case_id, event_type, from_status, to_status, actor_user_id, payload)
        values (${caseId}, 'ai.triage_queued', ${kase.status}, 'ai_triage_queued', ${user.id}, ${jsonb({ jobId: job.id, backend: job.backend })})
      `;
    });
    const requestMeta = getRequestMeta(req);
    await auditLog({
      actorUserId: user.id,
      action: 'ai.triage_queue',
      resourceType: 'case',
      resourceId: caseId,
      tenantId: kase.tenantId,
      caseId,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
      payload: { jobId: job.id, backend: job.backend }
    });
    return Response.json({ job });
  } catch (error) {
    return toErrorResponse(error);
  }
}
