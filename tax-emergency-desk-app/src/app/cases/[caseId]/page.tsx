import { redirect } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { StatusBadge } from '@/components/StatusBadge';
import { sql } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { assertCanAccessCase } from '@/server/auth/authorization';
import { getSessionUser } from '@/server/auth/session';
import type { Case, DocumentRow } from '@/server/db/types';
import { CaseActions } from './ui';

type IdRow = { id: string };
type DocumentExtractionRow = IdRow & { documentId: string };
type EvidenceItemRow = IdRow & { status: string; label: string };
type AiOutputRow = IdRow & { outputType: string; outputJson: unknown };
type DeliverableRow = IdRow & { versions: Array<{ contentMarkdown: string }> };
type EventRow = IdRow & { eventType: string; createdAt: Date; toStatus: string | null };

const PROCESS_STEPS = [
  { key: 'intake', label: 'Intake', statuses: ['intake_started', 'docs_uploaded'] },
  { key: 'ai', label: 'AI triage', statuses: ['ai_triage_queued', 'ai_triage_running', 'ai_triage_done'] },
  { key: 'review', label: 'Review', statuses: ['ops_review', 'reviewer_assigned', 'reviewer_reviewing', 'senior_qc'] },
  { key: 'final', label: 'Final pack', statuses: ['final_draft_ready', 'delivered'] },
  { key: 'outcome', label: 'Outcome', statuses: ['outcome_pending', 'closed'] }
];

export default async function CaseDetailPage({ params }: { params: Promise<{ caseId: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const { caseId } = await params;
  const [baseCase] = await sql<Case[]>`select * from cases where id = ${caseId} limit 1`;
  if (!baseCase) throw new AppError('NOT_FOUND', 'Kasus tidak ditemukan.', 404);
  await assertCanAccessCase(user, baseCase);
  const documents = await sql<DocumentRow[]>`select * from documents where case_id = ${caseId} order by created_at asc`;
  const documentIds = documents.map((doc) => doc.id);
  const extractions = documentIds.length ? await sql<DocumentExtractionRow[]>`select * from document_extractions where document_id in ${sql(documentIds)} order by created_at desc` : [];
  const [taxIssues, evidenceItems, aiOutputs, deliverables, reviews, events] = await Promise.all([
    sql<IdRow[]>`select * from tax_issues where case_id = ${caseId} order by created_at asc`,
    sql<EvidenceItemRow[]>`select * from evidence_items where case_id = ${caseId} order by created_at asc`,
    sql<AiOutputRow[]>`select * from ai_outputs where case_id = ${caseId} order by created_at desc limit 20`,
    sql<DeliverableRow[]>`
      select
        d.*,
        coalesce(
          jsonb_agg(
            jsonb_build_object(
              'id', v.id,
              'versionNumber', v.version_number,
              'contentMarkdown', v.content_markdown,
              'contentHtml', v.content_html,
              'storageKey', v.storage_key,
              'createdAt', v.created_at
            )
            order by v.version_number desc
          ) filter (where v.id is not null),
          '[]'::jsonb
        ) as versions
      from deliverables d
      left join deliverable_versions v on v.deliverable_id = d.id
      where d.case_id = ${caseId}
      group by d.id
      order by d.created_at desc
    `,
    sql<IdRow[]>`select * from reviews where case_id = ${caseId} order by created_at desc`,
    sql<EventRow[]>`select * from case_events where case_id = ${caseId} order by created_at desc limit 10`
  ]);
  const kase = {
    ...baseCase,
    documents: documents.map((doc) => ({
      ...doc,
      extractions: extractions.filter((extraction) => extraction.documentId === doc.id)
    })),
    taxIssues,
    evidenceItems,
    aiOutputs,
    deliverables,
    reviews,
    events
  };

  const latestVersion = kase.deliverables[0]?.versions[0];
  const currentStepIndex = PROCESS_STEPS.findIndex((step) => step.statuses.includes(kase.status));
  const missingEvidence = kase.evidenceItems.filter((item) => ['missing', 'insufficient'].includes(item.status)).length;

  return (
    <>
      <Nav />
      <main className="shell section stack">
        <div className="actions" style={{ justifyContent: 'space-between' }}>
          <div>
            <p className="eyebrow">Case file</p>
            <h2>{kase.title}</h2>
            <p className="muted">{kase.id}</p>
          </div>
          <StatusBadge status={kase.status} />
        </div>
        <CaseActions caseId={kase.id} status={kase.status} />

        <div className="progress-track">
          {PROCESS_STEPS.map((step, index) => (
            <div className={`progress-step ${index < currentStepIndex ? 'done' : ''} ${index === currentStepIndex ? 'active' : ''}`} key={step.key}>
              <span className="rail-meta">{String(index + 1).padStart(2, '0')}</span>
              <strong>{step.label}</strong>
            </div>
          ))}
        </div>

        <div className="metric-grid">
          <div className="metric"><span>Documents</span><strong>{kase.documents.length}</strong><p className="muted">Evidence uploaded</p></div>
          <div className="metric"><span>Tax issues</span><strong>{kase.taxIssues.length}</strong><p className="muted">Detected or reviewed</p></div>
          <div className="metric"><span>Evidence gaps</span><strong>{missingEvidence}</strong><p className="muted">{kase.evidenceItems.length} checklist rows</p></div>
          <div className="metric"><span>AI records</span><strong>{kase.aiOutputs.length}</strong><p className="muted">Stored outputs</p></div>
        </div>

        <section className="workbench">
          <aside className="stack">
            <div className="card">
              <div className="panel-title"><h3>Uploaded docs</h3><span className="kpi">{kase.documents.length} files</span></div>
              <div className="rail">{kase.documents.map((doc) => <div className="rail-item" key={doc.id}><strong>{doc.originalFilename}</strong><span className="rail-meta">{doc.category} / {doc.status}</span></div>)}</div>
            </div>
            <div className="card">
              <div className="panel-title"><h3>Evidence checklist</h3><span className="kpi">{missingEvidence} gaps</span></div>
              <div className="rail">{kase.evidenceItems.map((item) => <div className="rail-item" key={item.id}><div className="actions" style={{ justifyContent: 'space-between' }}><strong>{item.label}</strong><StatusBadge status={item.status} /></div></div>)}</div>
            </div>
            <div className="card">
              <div className="panel-title"><h3>Timeline</h3><span className="kpi">{kase.events.length} events</span></div>
              <div className="rail">{kase.events.map((event) => <div className="rail-item" key={event.id}><strong>{event.eventType}</strong><span className="rail-meta">{event.createdAt.toLocaleString('id-ID')} {event.toStatus ? `/ ${event.toStatus}` : ''}</span></div>)}</div>
            </div>
          </aside>
          <article className="stack">
            {latestVersion && <div className="card"><div className="panel-title"><h3>Latest deliverable</h3><span className="kpi">draft preview</span></div><pre className="markdown">{latestVersion.contentMarkdown}</pre></div>}
            <div className="card"><div className="panel-title"><h3>AI outputs</h3><span className="kpi">{kase.aiOutputs.length} records</span></div>{kase.aiOutputs.map((out) => <details key={out.id}><summary>{out.outputType}</summary><pre className="markdown">{JSON.stringify(out.outputJson, null, 2)}</pre></details>)}</div>
          </article>
        </section>
      </main>
    </>
  );
}
