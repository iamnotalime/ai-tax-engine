import type { CaseStatus } from '@/server/db/types';
import { CASE_STATUS_TRANSITIONS } from '@/lib/constants';
import { AppError } from '@/lib/errors';

export function assertValidStatusTransition(from: CaseStatus, to: CaseStatus) {
  const allowed = CASE_STATUS_TRANSITIONS[from] as readonly string[];
  if (!allowed.includes(to)) throw new AppError('INVALID_STATUS_TRANSITION', `Status ${from} tidak dapat berubah ke ${to}.`, 409);
}
