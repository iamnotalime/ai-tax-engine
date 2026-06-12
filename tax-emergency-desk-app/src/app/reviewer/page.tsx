import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { StatusBadge } from '@/components/StatusBadge';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/server/auth/session';
import { requireTenantFromCookies } from '@/server/tenancy/context';
import type { Case } from '@/server/db/types';

type ReviewerQueueCase = Case & {
  documentCount: number;
  evidenceCount: number;
};

export default async function ReviewerQueuePage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (!['tax_associate', 'licensed_tax_consultant', 'ops', 'admin'].includes(user.role)) redirect('/dashboard');
  const tenant = await requireTenantFromCookies(user);
  const reviewStatuses = ['ai_triage_done', 'paid', 'ops_review', 'reviewer_assigned', 'reviewer_reviewing', 'senior_qc', 'final_draft_ready'];
  const cases = await sql<ReviewerQueueCase[]>`
    select
      c.*,
      (select count(*)::int from documents d where d.case_id = c.id) as document_count,
      (select count(*)::int from evidence_items e where e.case_id = c.id) as evidence_count
    from cases c
    where c.tenant_id = ${tenant.tenantId}
      and c.status in ${sql(reviewStatuses)}
    order by c.updated_at desc
    limit 50
  `;
  return (
    <>
      <Nav />
      <main className="shell section stack">
        <p className="eyebrow">Reviewer workbench</p>
        <h2>Queue yang perlu judgement manusia.</h2>
        <table className="table"><thead><tr><th>Case</th><th>Status</th><th>Docs</th><th>Evidence</th></tr></thead><tbody>{cases.map((kase) => <tr key={kase.id}><td><Link href={`/reviewer/cases/${kase.id}`}>{kase.title}</Link></td><td><StatusBadge status={kase.status} /></td><td>{kase.documentCount}</td><td>{kase.evidenceCount}</td></tr>)}</tbody></table>
      </main>
    </>
  );
}
