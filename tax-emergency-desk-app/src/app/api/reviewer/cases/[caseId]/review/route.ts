import { NextRequest } from 'next/server';
import { z } from 'zod';
import { env } from '@/config/env';
import { jsonb, sql } from '@/lib/db';
import { AppError, toErrorResponse } from '@/lib/errors';
import { getRequestMeta } from '@/lib/http';
import { assertSameOrigin } from '@/lib/security';
import { auditLog } from '@/server/audit/audit';
import { assertCanAccessCase, assertCanApprove } from '@/server/auth/authorization';
import { requireRole } from '@/server/auth/session';
import { transitionCaseStatus } from '@/server/cases/service';
import { CaseStatus, ReviewDecision, ReviewType, type Case } from '@/server/db/types';

const schema = z.object({
  reviewType: z.nativeEnum(ReviewType),
  decision: z.nativeEnum(ReviewDecision),
  comments: z.string().max(5000).optional(),
  correctedJson: z.unknown().optional(),
  checklistJson: z.unknown().optional()
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ caseId: string }> }) {
  try {
    assertSameOrigin(req);
    const user = await requireRole(['tax_associate', 'licensed_tax_consultant', 'admin']);
    const { caseId } = await ctx.params;
    const input = schema.parse(await req.json());
    if (input.reviewType === 'senior_qc' && input.decision === 'approve') assertCanApprove(user);
    const [kase] = await sql<Case[]>`select * from cases where id = ${caseId} limit 1`;
    if (!kase) throw new AppError('NOT_FOUND', 'Kasus tidak ditemukan.', 404);
    await assertCanAccessCase(user, kase);

    const assignmentRequired = env.REVIEW_ASSIGNMENT_REQUIRED ?? env.APP_ENV === 'production';
    if (assignmentRequired && user.role !== 'admin') {
      const [assignment] = await sql<Array<{ id: string }>>`
        select id
        from reviewer_assignments
        where case_id = ${caseId}
          and reviewer_user_id = ${user.id}
          and status in ('assigned', 'accepted', 'in_progress')
        limit 1
      `;
      if (!assignment) throw new AppError('REVIEWER_NOT_ASSIGNED', 'Reviewer belum ditugaskan ke kasus ini.', 403);
    }

    const review = await sql.begin(async (tx) => {
      const [created] = await tx<Record<string, unknown>[]>`
        insert into reviews (
          case_id,
          reviewer_user_id,
          review_type,
          decision,
          comments,
          corrected_json,
          checklist_json
        )
        values (
          ${caseId},
          ${user.id},
          ${input.reviewType},
          ${input.decision},
          ${input.comments ?? null},
          ${input.correctedJson === undefined ? null : jsonb(input.correctedJson)},
          ${jsonb(input.checklistJson === undefined ? {} : input.checklistJson)}
        )
        returning *
      `;
      if (input.decision === 'approve' && input.reviewType === 'senior_qc') {
        await transitionCaseStatus(tx, {
          caseId,
          fromStatus: kase.status,
          toStatus: CaseStatus.final_draft_ready,
          actorUserId: user.id,
          eventType: 'review.status_changed',
          payload: { reviewId: created.id, decision: input.decision, reviewType: input.reviewType }
        });
        const [deliverable] = await tx<Array<{ id: string }>>`
          select id from deliverables where case_id = ${caseId} order by created_at desc limit 1
        `;
        if (deliverable) {
          await tx`
            update deliverables
            set status = 'approved', approved_by_user_id = ${user.id}, approved_at = now(), updated_at = now()
            where id = ${deliverable.id}
          `;
        }
      } else if (input.decision === 'request_more_docs') {
        await transitionCaseStatus(tx, {
          caseId,
          fromStatus: kase.status,
          toStatus: CaseStatus.need_more_docs,
          actorUserId: user.id,
          eventType: 'review.status_changed',
          payload: { reviewId: created.id, decision: input.decision, reviewType: input.reviewType }
        });
      }
      await tx`
        insert into case_events (case_id, event_type, actor_user_id, payload)
        values (${caseId}, 'review.submitted', ${user.id}, ${jsonb({ reviewId: created.id, decision: input.decision, reviewType: input.reviewType })})
      `;
      return created;
    });
    const requestMeta = getRequestMeta(req);
    await auditLog({
      actorUserId: user.id,
      action: 'review.submit',
      resourceType: 'review',
      resourceId: String(review.id),
      tenantId: kase.tenantId,
      caseId,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
      payload: { decision: input.decision, reviewType: input.reviewType }
    });
    return Response.json({ review }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
