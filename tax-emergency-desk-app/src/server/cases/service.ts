import { z } from 'zod';
import { jsonb, sql } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { CaseType, type AppUser, type Case, type CaseStatus } from '@/server/db/types';
import { assertValidStatusTransition } from './status';

export const createCaseSchema = z.object({
  caseType: z.nativeEnum(CaseType),
  title: z.string().min(3).max(160),
  taxpayerType: z.string().max(80).optional(),
  taxpayerName: z.string().max(160).optional(),
  packageCode: z.string().max(80).optional(),
  sourceChannel: z.string().max(120).optional(),
  consentVersion: z.string().default('privacy-v1')
});

export async function createCase(user: AppUser, input: z.infer<typeof createCaseSchema>, tenantId: string) {
  const parsed = createCaseSchema.parse(input);
  return sql.begin(async (tx) => {
    const [kase] = await tx<Case[]>`
      insert into cases (
        tenant_id,
        owner_user_id,
        case_type,
        title,
        taxpayer_type,
        taxpayer_name,
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

export async function transitionCase(params: { caseId: string; tenantId?: string; toStatus: CaseStatus; actorUserId?: string | null; reason?: string }) {
  const [kase] = await sql<Case[]>`
    select *
    from cases
    where id = ${params.caseId}
      ${params.tenantId ? sql`and tenant_id = ${params.tenantId}` : sql``}
    limit 1
  `;
  if (!kase) throw new AppError('NOT_FOUND', 'Kasus tidak ditemukan.', 404);
  assertValidStatusTransition(kase.status, params.toStatus);
  return sql.begin(async (tx) => {
    const [updated] = await tx<Case[]>`
      update cases
      set status = ${params.toStatus}, updated_at = now()
      where id = ${kase.id}
      returning *
    `;
    await tx`
      insert into case_events (case_id, event_type, from_status, to_status, actor_user_id, payload)
      values (
        ${kase.id},
        'case.status_changed',
        ${kase.status},
        ${params.toStatus},
        ${params.actorUserId ?? null},
        ${jsonb({ reason: params.reason ?? null })}
      )
    `;
    return updated;
  });
}
