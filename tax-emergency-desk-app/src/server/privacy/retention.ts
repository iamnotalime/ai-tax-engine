import { env } from '@/config/env';
import { sql } from '@/lib/db';
import { auditLog } from '@/server/audit/audit';
import { getStorageAdapter } from '@/server/storage';

type ExpiredCase = {
  id: string;
  tenantId: string;
  ownerUserId: string;
  packageCode: string | null;
};

async function redactExpiredAiRawText(tenantId?: string) {
  const rows = await sql<Array<{ id: string }>>`
    update ai_outputs
    set raw_text = null
    where raw_text is not null
      and created_at < now() - (${env.AI_RAW_RETENTION_DAYS} * interval '1 day')
      ${
        tenantId
          ? sql`and exists (
              select 1
              from cases c
              where c.id = ai_outputs.case_id
                and c.tenant_id = ${tenantId}
            )`
          : sql``
      }
    returning id
  `;
  return rows.length;
}

async function expiredCases(tenantId?: string) {
  return sql<ExpiredCase[]>`
    select id, tenant_id, owner_user_id, package_code
    from cases
    where status in ('closed', 'cancelled')
      ${tenantId ? sql`and tenant_id = ${tenantId}` : sql``}
      and (
        (coalesce(package_code, 'free_ai_scan') = 'free_ai_scan' and updated_at < now() - (${env.FREE_SCAN_RETENTION_DAYS} * interval '1 day'))
        or
        (coalesce(package_code, 'free_ai_scan') <> 'free_ai_scan' and updated_at < now() - (${env.PAID_CASE_RETENTION_DAYS} * interval '1 day'))
      )
    order by updated_at asc
    limit 100
  `;
}

async function deleteCase(caseId: string) {
  const documents = await sql<Array<{ storageKey: string }>>`select storage_key from documents where case_id = ${caseId}`;
  const storage = getStorageAdapter();
  for (const document of documents) {
    await storage.deleteObject(document.storageKey);
  }
  await sql`delete from cases where id = ${caseId}`;
}

export async function runRetentionSweep(tenantId?: string) {
  const [run] = await sql<Array<{ id: string }>>`
    insert into retention_runs (tenant_id)
    values (${tenantId ?? null})
    returning id
  `;
  try {
    const aiRawOutputsRedacted = await redactExpiredAiRawText(tenantId);
    const cases = await expiredCases(tenantId);
    for (const kase of cases) {
      await deleteCase(kase.id);
      await auditLog({
        action: 'retention.case_deleted',
        resourceType: 'case',
        resourceId: kase.id,
        tenantId: kase.tenantId,
        payload: { ownerUserId: kase.ownerUserId, packageCode: kase.packageCode }
      });
    }
    await sql`
      update retention_runs
      set status = 'succeeded',
          completed_at = now(),
          ai_raw_outputs_redacted = ${aiRawOutputsRedacted},
          cases_deleted = ${cases.length}
      where id = ${run.id}
    `;
    return { aiRawOutputsRedacted, casesDeleted: cases.length };
  } catch (error) {
    await sql`
      update retention_runs
      set status = 'failed',
          completed_at = now(),
          error_message = ${error instanceof Error ? error.message : String(error)}
      where id = ${run.id}
    `;
    throw error;
  }
}
