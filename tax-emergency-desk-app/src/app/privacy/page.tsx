import { redirect } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { StatusBadge } from '@/components/StatusBadge';
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

  return (
    <>
      <Nav />
      <main className="shell section stack">
        <div>
          <p className="eyebrow">Privacy ops</p>
          <h2>Data controls</h2>
        </div>
        <div className="card">
          <PrivacyActions />
        </div>
        <div className="card">
          <h3>Request ledger</h3>
          <table className="table">
            <thead><tr><th>Type</th><th>Status</th><th>Requested</th><th>Fulfilled</th></tr></thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>{request.requestType}</td>
                  <td><StatusBadge status={request.status} /></td>
                  <td>{request.requestedAt.toLocaleString('id-ID')}</td>
                  <td>{request.fulfilledAt ? request.fulfilledAt.toLocaleString('id-ID') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
