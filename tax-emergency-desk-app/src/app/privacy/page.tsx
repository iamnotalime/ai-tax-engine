import { redirect } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { EmptyState } from '@/components/EmptyState';
import { PrivacyRequestTable } from '@/components/PrivacyRequestTable';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/server/auth/session';
import { requireTenantFromCookies } from '@/server/tenancy/context';
import type { DataSubjectRequestRow } from '@/server/db/types';
import { PrivacyActions } from './ui';

export default async function PrivacyPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const tenant = await requireTenantFromCookies(user);
  const requests = await sql<DataSubjectRequestRow[]>`
    select *
    from data_subject_requests
    where target_user_id = ${user.id}
      and tenant_id = ${tenant.tenantId}
    order by requested_at desc
    limit 20
  `;
  const requestRows = requests.map((request) => ({
    id: request.id,
    requestType: request.requestType,
    status: request.status,
    requestedAt: request.requestedAt.toISOString(),
    fulfilledAt: request.fulfilledAt?.toISOString() ?? null
  }));

  return (
    <>
      <Nav />
      <main className="shell section stack">
        <div className="page-header compact">
          <div className="page-copy">
          <p className="eyebrow">Privacy ops</p>
          <h2>Data controls</h2>
          <p className="lede">Export your case data or queue a deletion request for this workspace.</p>
          </div>
        </div>
        <div className="card">
          <PrivacyActions />
        </div>
        {!requests.length ? <EmptyState title="Belum ada request" body="Export atau deletion request akan muncul di ledger ini." /> : <PrivacyRequestTable rows={requestRows} />}
      </main>
    </>
  );
}
