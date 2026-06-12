import type { AppUser, Case } from '@/server/db/types';
import { AppError } from '@/lib/errors';
import { getTenantMembership } from '@/server/tenancy/context';

const INTERNAL_ROLES = new Set(['support', 'ops', 'tax_associate', 'licensed_tax_consultant', 'admin']);
const PRIVILEGED_TENANT_ROLES = new Set(['owner', 'admin', 'ops', 'reviewer']);

export async function canAccessCase(user: AppUser, kase: Pick<Case, 'tenantId' | 'ownerUserId'>) {
  const membership = await getTenantMembership(user.id, kase.tenantId);
  if (!membership) return false;
  if (user.id === kase.ownerUserId) return true;
  return INTERNAL_ROLES.has(user.role) || PRIVILEGED_TENANT_ROLES.has(membership.role);
}

export async function assertCanAccessCase(user: AppUser, kase: Pick<Case, 'tenantId' | 'ownerUserId'>) {
  if (!(await canAccessCase(user, kase))) throw new AppError('FORBIDDEN', 'Anda tidak memiliki akses ke kasus ini.', 403);
}

export function assertInternal(user: AppUser) {
  if (!INTERNAL_ROLES.has(user.role)) throw new AppError('FORBIDDEN', 'Akses internal diperlukan.', 403);
}

export function assertCanApprove(user: AppUser) {
  if (!['licensed_tax_consultant', 'admin'].includes(user.role)) throw new AppError('FORBIDDEN', 'Final approval membutuhkan konsultan pajak berizin atau admin.', 403);
}
