import { z } from 'zod';
import type postgres from 'postgres';
import { encryptSensitiveString, stableHashSensitive } from '@/lib/crypto';
import { jsonb, sql } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { CaseType, type AppUser, type Case, type CaseStatus } from '@/server/db/types';
import { assertSafeUserIntent } from '@/server/ai/guardrails';
import { assertValidStatusTransition } from './status';

type SqlExecutor = postgres.Sql | postgres.TransactionSql;

export const createCaseSchema = z.object({
  caseType: z.nativeEnum(CaseType),
  title: z.string().min(3).max(160),
  taxpayerType: z.string().max(80).optional(),
  taxpayerName: z.string().max(160).optional(),
  taxpayerNpwp: z.string().max(40).optional(),
  packageCode: z.string().max(80).optional(),
  sourceChannel: z.string().max(120).optional(),
  consentVersion: z.string().default('privacy-v1')
});

export async function createCase(user: AppUser, input: z.infer<typeof createCaseSchema>, tenantId: string) {
  const parsed = createCaseSchema.parse(input);
  assertSafeUserIntent([parsed.title, parsed.taxpayerName, parsed.sourceChannel].filter(Boolean).join('\n'));
  const taxpayerNpwp = parsed.taxpayerNpwp?.trim() || null;
  const taxpayerNpwpHash = taxpayerNpwp ? stableHashSensitive(taxpayerNpwp) : null;
  const taxpayerNpwpEncrypted = taxpayerNpwp ? encryptSensitiveString(taxpayerNpwp) : null;
  return sql.begin(async (tx) => {
    const [kase] = await tx<Case[]>`
      insert into cases (
        tenant_id,
        owner_user_id,
        case_type,
        title,
        taxpayer_type,
        taxpayer_name,
        taxpayer_npwp_hash,
        taxpayer_npwp_encrypted,
        package_code,
        source_channel,
        status,
        consent_version,
        consented_at
      )
      values (
        ${tenantId},
        ${user.id},
        ${parsed.caseType},
        ${parsed.title},
        ${parsed.taxpayerType ?? null},
        ${parsed.taxpayerName ?? null},
        ${taxpayerNpwpHash},
        ${taxpayerNpwpEncrypted},
        ${parsed.packageCode ?? 'free_ai_scan'},
        ${parsed.sourceChannel ?? null},
        'intake_started',
        ${parsed.consentVersion},
        now()
      )
      returning *
    `;
    await tx`
      insert into consent_records (user_id, case_id, consent_type, consent_version, granted)
      values (${user.id}, ${kase.id}, 'document_processing_ai_human_review', ${parsed.consentVersion}, true)
    `;
    await tx`
      insert into case_events (case_id, event_type, to_status, actor_user_id, payload)
      values (${kase.id}, 'case.created', 'intake_started', ${user.id}, ${jsonb({ caseType: parsed.caseType })})
    `;
    return kase;
  });
}

export function sanitizeCaseForResponse<T extends { taxpayerNpwpEncrypted?: unknown }>(kase: T): Omit<T, 'taxpayerNpwpEncrypted'> {
  const safeCase = { ...kase };
  delete safeCase.taxpayerNpwpEncrypted;
  return safeCase;
}

export async function transitionCaseStatus(
  db: SqlExecutor,
  params: {
    caseId: string;
    fromStatus: CaseStatus;
    toStatus: CaseStatus;
    actorUserId?: string | null;
    eventType: string;
    payload?: Record<string, unknown>;
    closeCase?: boolean;
  }
) {
  if (params.fromStatus !== params.toStatus) assertValidStatusTransition(params.fromStatus, params.toStatus);
  const [updated] = await db<Case[]>`
    update cases
    set
      status = ${params.toStatus},
      closed_at = case when ${params.closeCase ?? false} then now() else closed_at end,
      updated_at = now()
    where id = ${params.caseId}
      and status = ${params.fromStatus}
    returning *
  `;
  if (!updated) {
    const [current] = await db<Array<{ status: CaseStatus }>>`
      select status
      from cases
      where id = ${params.caseId}
      limit 1
    `;
    if (!current) throw new AppError('NOT_FOUND', 'Kasus tidak ditemukan.', 404);
    throw new AppError('CASE_STATUS_CONFLICT', 'Status kasus sudah berubah. Muat ulang sebelum melanjutkan.', 409, {
      expectedStatus: params.fromStatus,
      currentStatus: current.status,
      attemptedStatus: params.toStatus
    });
  }
  await db`
    insert into case_events (case_id, event_type, from_status, to_status, actor_user_id, payload)
    values (
      ${params.caseId},
      ${params.eventType},
      ${params.fromStatus},
      ${params.toStatus},
      ${params.actorUserId ?? null},
      ${jsonb(params.payload ?? {})}
    )
  `;
  return updated;
}

export async function transitionCase(params: { caseId: string; tenantId?: string; toStatus: CaseStatus; actorUserId?: string | null; reason?: string }) {
  const [kase] = await sql<Case[]>`
    select *
    from cases
    where id = ${params.caseId}
      ${params.tenantId ? sql`and tenant_id = ${params.tenantId}` : sql``}
    limit 1
  `;
  if (!kase) throw new AppError('NOT_FOUND', 'Kasus tidak ditemukan.', 404);
  return sql.begin(async (tx) => {
    return transitionCaseStatus(tx, {
      caseId: kase.id,
      fromStatus: kase.status,
      toStatus: params.toStatus,
      actorUserId: params.actorUserId,
      eventType: 'case.status_changed',
      payload: { reason: params.reason ?? null }
    });
  });
}
