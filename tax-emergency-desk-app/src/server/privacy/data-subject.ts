import { jsonb, sql } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { auditLog } from '@/server/audit/audit';
import type { AppUser, Case, DataSubjectRequestRow, DocumentRow } from '@/server/db/types';
import { enqueueJob } from '@/server/jobs/queue';
import { getStorageAdapter } from '@/server/storage';

type ExportBundle = {
  exportedAt: string;
  user: Pick<AppUser, 'id' | 'email' | 'fullName' | 'phone' | 'role' | 'createdAt'>;
  cases: Case[];
  documents: DocumentRow[];
  aiOutputs: Record<string, unknown>[];
  deliverables: Record<string, unknown>[];
  reviews: Record<string, unknown>[];
  outcomes: Record<string, unknown>[];
  consentRecords: Record<string, unknown>[];
};

async function userCaseIds(userId: string, tenantId: string) {
  const cases = await sql<Array<{ id: string }>>`select id from cases where owner_user_id = ${userId} and tenant_id = ${tenantId}`;
  return cases.map((kase) => kase.id);
}

export async function buildDataExport(user: AppUser, tenantId: string): Promise<ExportBundle> {
  const caseIds = await userCaseIds(user.id, tenantId);
  const [cases, documents, aiOutputs, deliverables, reviews, outcomes, consentRecords] = await Promise.all([
    sql<Case[]>`select * from cases where owner_user_id = ${user.id} and tenant_id = ${tenantId} order by created_at asc`,
    caseIds.length ? sql<DocumentRow[]>`select * from documents where case_id in ${sql(caseIds)} order by created_at asc` : Promise.resolve([]),
    caseIds.length ? sql<Record<string, unknown>[]>`select * from ai_outputs where case_id in ${sql(caseIds)} order by created_at asc` : Promise.resolve([]),
    caseIds.length
      ? sql<Record<string, unknown>[]>`
          select d.*, coalesce(jsonb_agg(v.* order by v.version_number asc) filter (where v.id is not null), '[]'::jsonb) as versions
          from deliverables d
          left join deliverable_versions v on v.deliverable_id = d.id
          where d.case_id in ${sql(caseIds)}
          group by d.id
          order by d.created_at asc
        `
      : Promise.resolve([]),
    caseIds.length ? sql<Record<string, unknown>[]>`select * from reviews where case_id in ${sql(caseIds)} order by created_at asc` : Promise.resolve([]),
    caseIds.length ? sql<Record<string, unknown>[]>`select * from case_outcomes where case_id in ${sql(caseIds)} order by created_at asc` : Promise.resolve([]),
    sql<Record<string, unknown>[]>`select * from consent_records where user_id = ${user.id} order by created_at asc`
  ]);

  return {
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt
    },
    cases,
    documents,
    aiOutputs,
    deliverables,
    reviews,
    outcomes,
    consentRecords
  };
}

export async function recordFulfilledExport(user: AppUser, tenantId: string, summary: Record<string, unknown>) {
  const [request] = await sql<DataSubjectRequestRow[]>`
    insert into data_subject_requests (
      tenant_id,
      requester_user_id,
      target_user_id,
      request_type,
      status,
      fulfilled_at,
      payload
    )
    values (${tenantId}, ${user.id}, ${user.id}, 'export', 'fulfilled', now(), ${jsonb(summary)})
    returning *
  `;
  return request;
}

export async function requestDataDeletion(user: AppUser, tenantId: string) {
  const [request] = await sql<DataSubjectRequestRow[]>`
    insert into data_subject_requests (tenant_id, requester_user_id, target_user_id, request_type, payload)
    values (${tenantId}, ${user.id}, ${user.id}, 'delete', ${jsonb({ requestedBy: 'self_service' })})
    returning *
  `;
  await enqueueJob('data_deletion', { requestId: request.id, tenantId }, 10, tenantId);
  return request;
}

async function deleteStoredDocumentsForOwner(userId: string, tenantId: string) {
  const documents = await sql<Array<Pick<DocumentRow, 'storageKey'>>>`
    select d.storage_key
    from documents d
    join cases c on c.id = d.case_id
    where c.owner_user_id = ${userId}
      and c.tenant_id = ${tenantId}
  `;
  const storage = getStorageAdapter();
  for (const document of documents) {
    await storage.deleteObject(document.storageKey);
  }
  return documents.length;
}

export async function processDataDeletionRequest(requestId: string) {
  const [request] = await sql<DataSubjectRequestRow[]>`
    update data_subject_requests
    set status = 'processing', error_message = null
    where id = ${requestId} and status in ('requested', 'failed')
    returning *
  `;
  if (!request) throw new AppError('DATA_REQUEST_NOT_FOUND', 'Data deletion request was not found or is already processing.', 404);
  if (!request.tenantId) throw new AppError('DATA_REQUEST_TENANT_REQUIRED', 'Data deletion request is missing tenant scope.', 400);

  try {
    const deletedDocumentCount = await deleteStoredDocumentsForOwner(request.targetUserId, request.tenantId);
    const deletedCaseIds = await userCaseIds(request.targetUserId, request.tenantId);
    await sql.begin(async (tx) => {
      await tx`delete from cases where owner_user_id = ${request.targetUserId} and tenant_id = ${request.tenantId}`;
      await tx`delete from tenant_memberships where user_id = ${request.targetUserId} and tenant_id = ${request.tenantId}`;
      const [{ count: remainingMemberships }] = await tx<Array<{ count: number }>>`
        select count(*)::int as count from tenant_memberships where user_id = ${request.targetUserId}
      `;
      if (remainingMemberships === 0) {
        await tx`
          update app_users
          set
            email = ${`deleted-${request.targetUserId}@deleted.local`},
            full_name = null,
            phone = null,
            password_hash = null,
            is_active = false,
            updated_at = now()
          where id = ${request.targetUserId}
        `;
      }
      await tx`
        update data_subject_requests
        set status = 'fulfilled',
            fulfilled_at = now(),
            payload = ${jsonb({ deletedCaseCount: deletedCaseIds.length, deletedDocumentCount, userAnonymized: remainingMemberships === 0 })}
        where id = ${request.id}
      `;
    });
    await auditLog({
      action: 'data.deleted',
      resourceType: 'data_subject_request',
      resourceId: request.id,
      tenantId: request.tenantId,
      payload: { targetUserId: request.targetUserId, deletedCaseCount: deletedCaseIds.length, deletedDocumentCount }
    });
    return { deletedCaseCount: deletedCaseIds.length, deletedDocumentCount };
  } catch (error) {
    await sql`
      update data_subject_requests
      set status = 'failed', error_message = ${error instanceof Error ? error.message : String(error)}
      where id = ${request.id}
    `;
    throw error;
  }
}
