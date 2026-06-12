import { redirect } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { StatusBadge } from '@/components/StatusBadge';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/server/auth/session';
import { requireTenantFromCookies } from '@/server/tenancy/context';
import type { Case, DataSubjectRequestRow, JobRow } from '@/server/db/types';
import { AdminOpsActions } from './ui';

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (!['ops', 'licensed_tax_consultant', 'admin'].includes(user.role)) redirect('/dashboard');
  const tenant = await requireTenantFromCookies(user);
  const [cases, jobs, audits, dataRequests, retentionRuns] = await Promise.all([
    sql<Case[]>`select * from cases where tenant_id = ${tenant.tenantId} order by created_at desc limit 25`,
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
  return (
    <>
      <Nav />
      <main className="shell section stack">
        <div className="actions" style={{ justifyContent: 'space-between' }}>
          <div>
            <p className="eyebrow">Ops command</p>
            <h2>Production control room</h2>
            <p className="lede">{tenant.tenantName} operational posture, queue pressure, privacy controls, and retention checks.</p>
          </div>
          <div className="kpi-strip">
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
            <div className="card">
              <div className="panel-title"><h3>Recent cases</h3><span className="kpi">{cases.length} rows</span></div>
              <table className="table"><thead><tr><th>Case</th><th>Status</th><th>Type</th><th>Created</th></tr></thead><tbody>{cases.map((kase) => <tr key={kase.id}><td><strong>{kase.title}</strong><br /><span className="muted">{kase.id.slice(0, 8)}</span></td><td><StatusBadge status={kase.status} /></td><td>{kase.caseType.replaceAll('_', ' ')}</td><td>{kase.createdAt.toLocaleString('id-ID')}</td></tr>)}</tbody></table>
            </div>
            <div className="card">
              <div className="panel-title"><h3>Recent jobs</h3><span className="kpi">{jobs.length} rows</span></div>
              <table className="table"><thead><tr><th>Job</th><th>Status</th><th>Attempts</th><th>Error</th></tr></thead><tbody>{jobs.map((job) => <tr key={job.id}><td>{job.jobType}</td><td><StatusBadge status={job.status} /></td><td>{job.attempts}/{job.maxAttempts}</td><td>{job.errorMessage ?? '-'}</td></tr>)}</tbody></table>
            </div>
          </div>
          <aside className="stack">
            <div className="card">
              <div className="panel-title"><h3>Data requests</h3><span className="kpi">{dataRequests.length} rows</span></div>
              <div className="rail">{dataRequests.map((request) => <div className="rail-item" key={request.id}><div className="actions" style={{ justifyContent: 'space-between' }}><strong>{request.requestType}</strong><StatusBadge status={request.status} /></div><span className="rail-meta">{request.requestedAt.toLocaleString('id-ID')}</span></div>)}</div>
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
