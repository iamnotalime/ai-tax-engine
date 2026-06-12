import { redirect } from 'next/navigation';
import { CaseWorklist } from '@/components/CaseWorklist';
import { Nav } from '@/components/Nav';
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
  const worklistRows = cases.map((kase) => ({
    id: kase.id,
    title: kase.title,
    status: kase.status,
    caseType: kase.caseType,
    packageCode: kase.packageCode,
    documentCount: Number(kase.documentCount),
    evidenceCount: Number(kase.evidenceCount),
    createdAt: kase.createdAt.toISOString(),
    updatedAt: kase.updatedAt.toISOString()
  }));
  return (
    <>
      <Nav />
      <main className="shell section stack">
        <div className="page-header compact">
          <div className="page-copy">
            <p className="eyebrow">Reviewer workbench</p>
            <h2>Queue yang perlu judgement manusia.</h2>
            <p className="lede">Prioritaskan kasus yang sudah masuk review, senior QC, atau final draft.</p>
          </div>
          <div className="page-actions"><span className="kpi">{cases.length} open review items</span></div>
        </div>
        <CaseWorklist
          rows={worklistRows}
          hrefBase="/reviewer/cases"
          title="Review queue"
          description="Prioritized review work with status filters, search, pagination, and bulk selection."
          emptyTitle="Review queue kosong"
          emptyBody="Tidak ada kasus yang menunggu reviewer saat ini."
        />
      </main>
    </>
  );
}
