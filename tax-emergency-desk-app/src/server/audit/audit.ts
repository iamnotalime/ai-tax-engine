import { jsonb, sql } from '@/lib/db';

export async function auditLog(params: {
  actorUserId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  tenantId?: string | null;
  caseId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  payload?: Record<string, unknown>;
}) {
  await sql`
    insert into audit_logs (
      actor_user_id,
      action,
      resource_type,
      resource_id,
      tenant_id,
      case_id,
      ip_address,
      user_agent,
      payload
    )
    values (
      ${params.actorUserId ?? null},
      ${params.action},
      ${params.resourceType},
      ${params.resourceId ?? null},
      ${params.tenantId ?? null},
      ${params.caseId ?? null},
      ${params.ipAddress ?? null},
      ${params.userAgent ?? null},
      ${jsonb(params.payload ?? {})}
    )
  `;
}
