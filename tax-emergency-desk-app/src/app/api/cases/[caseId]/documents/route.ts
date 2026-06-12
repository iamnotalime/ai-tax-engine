import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { AppError, toErrorResponse } from '@/lib/errors';
import { getRequestMeta } from '@/lib/http';
import { assertSameOrigin } from '@/lib/security';
import { auditLog } from '@/server/audit/audit';
import { requireUser } from '@/server/auth/session';
import { assertCanAccessCase } from '@/server/auth/authorization';
import { assertDocumentUploadLimit } from '@/server/documents/limits';
import { storeCaseDocument } from '@/server/documents/upload';
import { assertRateLimit, RATE_LIMITS } from '@/server/rate-limit';
import { CaseStatus, type Case } from '@/server/db/types';

export async function POST(req: NextRequest, ctx: { params: Promise<{ caseId: string }> }) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const { caseId } = await ctx.params;
    const [kase] = await sql<Case[]>`select * from cases where id = ${caseId} limit 1`;
    if (!kase) throw new AppError('NOT_FOUND', 'Kasus tidak ditemukan.', 404);
    await assertCanAccessCase(user, kase);
    await assertRateLimit(req, RATE_LIMITS.uploadCase, [kase.tenantId, user.id, caseId]);
    const requestMeta = getRequestMeta(req);
    const form = await req.formData();
    const files = form.getAll('files').filter((value): value is File => value instanceof File);
    if (!files.length) throw new AppError('NO_FILES', 'Tidak ada file yang diunggah.', 400);
    const [{ count: existingDocumentCount }] = await sql<Array<{ count: number }>>`
      select count(*)::int as count
      from documents
      where case_id = ${caseId}
        and status <> 'deleted'
    `;
    assertDocumentUploadLimit({ packageCode: kase.packageCode, existingDocumentCount, attemptedUploadCount: files.length });
    const documents = [];
    let fromStatus = kase.status;
    for (const file of files) {
      documents.push(await storeCaseDocument({ caseId, uploadedByUserId: user.id, file, fromStatus }));
      fromStatus = CaseStatus.docs_uploaded;
    }
    await auditLog({
      actorUserId: user.id,
      action: 'document.upload',
      resourceType: 'document',
      tenantId: kase.tenantId,
      caseId,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
      payload: { documentIds: documents.map((doc) => doc.id), fileCount: documents.length }
    });
    return Response.json({ documents }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
