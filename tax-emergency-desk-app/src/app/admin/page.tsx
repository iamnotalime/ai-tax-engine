import { redirect } from 'next/navigation';
import { CaseWorklist } from '@/components/CaseWorklist';
import { JobWorklist } from '@/components/JobWorklist';
import { Nav } from '@/components/Nav';
import { StatusBadge } from '@/components/StatusBadge';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/server/auth/session';
import { requireTenantFromCookies } from '@/server/tenancy/context';
import type { Case, DataSubjectRequestRow, JobRow } from '@/server/db/types';
import { AdminOpsActions } from './ui';

type AdminCase = Case & { documentCount: number };

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (!['ops', 'licensed_tax_consultant', 'admin'].includes(user.role)) redirect('/dashboard');
  const tenant = await requireTenantFromCookies(user);
  const [cases, jobs, audits, dataRequests, retentionRuns] = await Promise.all([
    sql<AdminCase[]>`
      select c.*, (select count(*)::int from documents d where d.case_id = c.id) as document_count
      from cases c
      where c.tenant_id = ${tenant.tenantId}
      order by c.created_at desc
      limit 25
    `,
    sql<JobRow[]>`select * from jobs where tenant_id = ${tenant.tenantId} order by created_at desc limit 25`,
    sql<Record<string, unknown>[]>`select * from audit_logs where tenant_id = ${tenant.tenantId} order by created_at desc limit 25`,
    sql<DataSubjectRequestRow[]>`select * from data_subject_requests where tenant_id = ${tenant.tenantId} order by requested_at desc limit 25`,
    sql<Array<{ id: string; status: string; startedAt: Date; completedAt: Date | null; aiRawOutputsRedacted: number; casesDeleted: number; errorMessage: string | null }>>`
      select * from retention_runs where tenant_id = ${tenant.tenantId} order by started_at desc limit 10
    `
  ]);
  const openCases = cases.filter((kase) => !['closed', 'cancelled', 'delivered'].includes(kase.status)).length;
  const failedJobs = jobs.filter((job) => job.status === 'failed').length;
  const queuedJobs = jobs.filter((job) => job.status === 'queued').length;
  const pendingDataRequests = dataRequests.filter((request) => request.status === 'requested' || request.status === 'processing').length;
  const latestRetention = retentionRuns[0];
  const caseRows = cases.map((kase) => ({
    id: kase.id,
    title: kase.title,
    status: kase.status,
    caseType: kase.caseType,
    packageCode: kase.packageCode,
    documentCount: Number(kase.documentCount),
    createdAt: kase.createdAt.toISOString(),
    updatedAt: kase.updatedAt.toISOString()
  }));
  const jobRows = jobs.map((job) => ({
    id: job.id,
    jobType: job.jobType,
    status: job.status,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    priority: job.priority,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString()
  }));
  return (
    <>
      <Nav />
      <main className="shell section stack">
        <div className="page-header compact">
          <div className="page-copy">
            <p className="eyebrow">Ops command</p>
            <h2>Production control room</h2>
            <p className="lede">{tenant.tenantName} operational posture, queue pressure, privacy controls, and retention checks.</p>
          </div>
          <div className="page-actions kpi-strip">
            <span className="kpi">role: {user.role}</span>
            <span className="kpi">audit: {audits.length}</span>
          </div>
        </div>
        {user.role === 'admin' && <div className="card"><AdminOpsActions /></div>}
        <div className="metric-grid">
          <div className="metric"><span>Open cases</span><strong>{openCases}</strong><p className="muted">{cases.length} recent loaded</p></div>
          <div className="metric"><span>Queued jobs</span><strong>{queuedJobs}</strong><p className="muted">{failedJobs} failed in view</p></div>
          <div className="metric"><span>Privacy queue</span><strong>{pendingDataRequests}</strong><p className="muted">Requests pending</p></div>
          <div className="metric"><span>Retention</span><strong>{latestRetention?.status === 'succeeded' ? 'OK' : 'Watch'}</strong><p className="muted">{latestRetention ? latestRetention.startedAt.toLocaleDateString('id-ID') : 'No runs'}</p></div>
        </div>
        <section className="workbench">
          <div className="stack">
            <CaseWorklist rows={caseRows} title="Recent cases" description="Operational case list with priority sorting and bulk ID actions." />
            <JobWorklist rows={jobRows} />
          </div>
          <aside className="stack">
            <div className="card">
              <div className="panel-title"><h3>Data requests</h3><span className="kpi">{dataRequests.length} rows</span></div>
              <div className="rail">{dataRequests.map((request) => <div className="rail-item" key={request.id}><div className="dense-row"><strong>{request.requestType}</strong><StatusBadge status={request.status} /></div><span className="rail-meta">{request.requestedAt.toLocaleString('id-ID')}</span></div>)}</div>
            </div>
            <div className="card">
              <div className="panel-title"><h3>Retention runs</h3><span className="kpi">{retentionRuns.length} rows</span></div>
              <div className="dense-list">{retentionRuns.map((run) => <div className="dense-row" key={run.id}><span><StatusBadge status={run.status} /> {run.casesDeleted} cases</span><span>{run.aiRawOutputsRedacted} AI raw</span></div>)}</div>
            </div>
          </aside>
        </section>
      </main>
    </>
  );
}
