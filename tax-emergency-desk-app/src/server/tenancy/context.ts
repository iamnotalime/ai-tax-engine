import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { AppError } from '@/lib/errors';
import type { AppUser, Tenant, TenantMembership, TenantMembershipRole } from '@/server/db/types';

const TENANT_COOKIE_NAME = 'taxdesk_tenant';
const PRIVILEGED_TENANT_ROLES = new Set<TenantMembershipRole>(['owner', 'admin', 'ops', 'reviewer']);

export type TenantContext = {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  tenantRole: TenantMembershipRole;
};

type TenantContextRow = Tenant & {
  membershipRole: TenantMembershipRole;
};

export function requestedTenantIdFromRequest(req: NextRequest) {
  return req.headers.get('x-tenant-id') ?? new URL(req.url).searchParams.get('tenantId');
}

export async function getTenantMembership(userId: string, tenantId: string) {
  const [membership] = await sql<TenantMembership[]>`
    select *
    from tenant_memberships
    where user_id = ${userId} and tenant_id = ${tenantId}
    limit 1
  `;
  return membership ?? null;
}

export async function requireTenantForUser(user: AppUser, requestedTenantId?: string | null): Promise<TenantContext> {
  const [row] = await sql<TenantContextRow[]>`
    select t.*, tm.role as membership_role
    from tenants t
    join tenant_memberships tm on tm.tenant_id = t.id
    where tm.user_id = ${user.id}
      and t.status = 'active'
      ${requestedTenantId ? sql`and t.id = ${requestedTenantId}` : sql``}
    order by tm.is_default desc, tm.created_at asc
    limit 1
  `;
  if (!row) throw new AppError('TENANT_NOT_FOUND', 'Workspace tidak ditemukan atau tidak dapat diakses.', 403);
  return {
    tenantId: row.id,
    tenantSlug: row.slug,
    tenantName: row.name,
    tenantRole: row.membershipRole
  };
}

export async function requireTenantFromRequest(user: AppUser, req: NextRequest) {
  return requireTenantForUser(user, requestedTenantIdFromRequest(req));
}

export async function requireTenantFromCookies(user: AppUser) {
  const jar = await cookies();
  return requireTenantForUser(user, jar.get(TENANT_COOKIE_NAME)?.value);
}

export async function assertTenantMember(user: AppUser, tenantId: string) {
  const membership = await getTenantMembership(user.id, tenantId);
  if (!membership) throw new AppError('FORBIDDEN', 'Anda tidak memiliki akses ke workspace ini.', 403);
  return membership;
}

export async function assertPrivilegedTenantMember(user: AppUser, tenantId: string) {
  const membership = await assertTenantMember(user, tenantId);
  if (!PRIVILEGED_TENANT_ROLES.has(membership.role)) {
    throw new AppError('FORBIDDEN', 'Anda tidak memiliki akses operasional di workspace ini.', 403);
  }
  return membership;
}

export async function createTenantForUser(user: Pick<AppUser, 'id' | 'email' | 'fullName'>) {
  const slug = `workspace-${user.id.slice(0, 8)}-${randomUUID().slice(0, 8)}`;
  const name = user.fullName ? `${user.fullName} Workspace` : `${user.email.split('@')[0]} Workspace`;
  const [tenant] = await sql<Tenant[]>`
    insert into tenants (slug, name)
    values (${slug}, ${name})
    returning *
  `;
  await sql`
    insert into tenant_memberships (tenant_id, user_id, role, is_default)
    values (${tenant.id}, ${user.id}, 'owner', true)
  `;
  return {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    tenantName: tenant.name,
    tenantRole: 'owner' as const
  };
}
