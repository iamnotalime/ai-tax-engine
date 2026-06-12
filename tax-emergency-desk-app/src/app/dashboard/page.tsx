import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/server/auth/session';
import { requireTenantFromCookies } from '@/server/tenancy/context';
import type { Case } from '@/server/db/types';

type DashboardCase = Case & { documentCount: number };

const ACTIVE_REVIEW_STATUSES = new Set(['ops_review', 'reviewer_assigned', 'reviewer_reviewing', 'senior_qc']);
const AI_STATUSES = new Set(['ai_triage_queued', 'ai_triage_running', 'ai_triage_done']);
const CLOSED_STATUSES = new Set(['closed', 'cancelled', 'delivered']);

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const tenant = await requireTenantFromCookies(user);
  const internal = ['support', 'ops', 'tax_associate', 'licensed_tax_consultant', 'admin'].includes(user.role);
  const cases = internal
    ? await sql<DashboardCase[]>`
        select c.*, (select count(*)::int from documents d where d.case_id = c.id) as document_count
        from cases c
        where c.tenant_id = ${tenant.tenantId}
        order by c.created_at desc
        limit 50
      `
    : await sql<DashboardCase[]>`
        select c.*, (select count(*)::int from documents d where d.case_id = c.id) as document_count
        from cases c
        where c.tenant_id = ${tenant.tenantId}
          and c.owner_user_id = ${user.id}
        order by c.created_at desc
        limit 50
      `;
  const activeCases = cases.filter((kase) => !CLOSED_STATUSES.has(kase.status)).length;
  const inAi = cases.filter((kase) => AI_STATUSES.has(kase.status)).length;
  const inReview = cases.filter((kase) => ACTIVE_REVIEW_STATUSES.has(kase.status)).length;
  const totalDocuments = cases.reduce((sum, kase) => sum + kase.documentCount, 0);
  const statusCounts = cases.reduce<Record<string, number>>((counts, kase) => {
    counts[kase.status] = (counts[kase.status] ?? 0) + 1;
    return counts;
  }, {});
  const recentCases = cases.slice(0, 8);
  return (
    <>
      <Nav />
      <main className="shell section stack">
        <div className="actions" style={{ justifyContent: 'space-between' }}>
          <div>
            <p className="eyebrow">Dashboard</p>
            <h2>Case operations</h2>
            <p className="lede">{tenant.tenantName} workspace triage, reviewer flow, and deliverable state.</p>
          </div>
          <Link className="button primary" href="/cases/new">Kasus baru</Link>
        </div>
        <div className="metric-grid">
          <div className="metric"><span>Active cases</span><strong>{activeCases}</strong><p className="muted">Open work items</p></div>
          <div className="metric"><span>AI pipeline</span><strong>{inAi}</strong><p className="muted">Queued or processed</p></div>
          <div className="metric"><span>Human review</span><strong>{inReview}</strong><p className="muted">Reviewer controlled</p></div>
          <div className="metric"><span>Documents</span><strong>{totalDocuments}</strong><p className="muted">Uploaded evidence</p></div>
        </div>
        {!cases.length ? <EmptyState title="Belum ada kasus" body="Mulai dari free scan SP2DK atau error Coretax/e-Faktur." /> : (
          <section className="workbench">
            <div className="card">
              <div className="panel-title">
                <div><h3>Case queue</h3><p className="muted">Recent case files with operational status.</p></div>
                <span className="kpi">{internal ? 'internal view' : 'owner view'}</span>
              </div>
              <table className="table">
                <thead><tr><th>Case</th><th>Type</th><th>Status</th><th>Docs</th><th>Updated</th></tr></thead>
                <tbody>
                  {recentCases.map((kase) => (
                    <tr key={kase.id}>
                      <td><Link href={`/cases/${kase.id}`}><strong>{kase.title ?? kase.id}</strong></Link><br /><span className="muted">{kase.id.slice(0, 8)}</span></td>
                      <td>{kase.caseType.replaceAll('_', ' ')}</td>
                      <td><StatusBadge status={kase.status} /></td>
                      <td>{kase.documentCount}</td>
                      <td>{kase.updatedAt.toLocaleDateString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <aside className="stack">
              <div className="card">
                <div className="panel-title"><h3>Status mix</h3><span className="kpi">{cases.length} total</span></div>
                <div className="dense-list">
                  {Object.entries(statusCounts).map(([status, count]) => (
                    <div className="dense-row" key={status}><StatusBadge status={status} /><strong>{count}</strong></div>
                  ))}
                </div>
              </div>
              <div className="risk-band">
                <p className="eyebrow">Control rule</p>
                <p className="muted">Case-specific paid outputs stay behind human review and senior approval.</p>
              </div>
            </aside>
          </section>
        )}
      </main>
    </>
  );
}
