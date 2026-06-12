import { redirect } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { StatusBadge } from '@/components/StatusBadge';
import { sql } from '@/lib/db';
import { assertCanAccessCase } from '@/server/auth/authorization';
import { getSessionUser } from '@/server/auth/session';
import type { Case, DocumentPageRow, DocumentRow } from '@/server/db/types';
import { ReviewForm } from './ui';

type IdRow = { id: string };
type EvidenceItemRow = IdRow & { status: string; label: string; description: string | null };
type AiOutputRow = IdRow & { outputType: string; outputJson: unknown };
type DeliverableRow = IdRow & { versions: Array<{ contentMarkdown: string }> };

export default async function ReviewerCasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (!['tax_associate', 'licensed_tax_consultant', 'ops', 'admin'].includes(user.role)) redirect('/dashboard');
  const { caseId } = await params;
  const [baseCase] = await sql<Case[]>`select * from cases where id = ${caseId} limit 1`;
  if (!baseCase) redirect('/reviewer');
  await assertCanAccessCase(user, baseCase);
  const documents = await sql<DocumentRow[]>`select * from documents where case_id = ${caseId} order by created_at asc`;
  const documentIds = documents.map((doc) => doc.id);
  const pages = documentIds.length ? await sql<DocumentPageRow[]>`select * from document_pages where document_id in ${sql(documentIds)} order by page_number asc` : [];
  const [taxIssues, evidenceItems, aiOutputs, deliverables, reviews] = await Promise.all([
    sql<IdRow[]>`select * from tax_issues where case_id = ${caseId} order by created_at asc`,
    sql<EvidenceItemRow[]>`select * from evidence_items where case_id = ${caseId} order by created_at asc`,
    sql<AiOutputRow[]>`select * from ai_outputs where case_id = ${caseId} order by created_at desc`,
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
    sql<IdRow[]>`select * from reviews where case_id = ${caseId} order by created_at desc`
  ]);
  const kase = {
    ...baseCase,
    documents: documents.map((doc) => ({ ...doc, pages: pages.filter((page) => page.documentId === doc.id) })),
    taxIssues,
    evidenceItems,
    aiOutputs,
    deliverables,
    reviews
  };
  const latestVersion = kase.deliverables[0]?.versions[0];
  return (
    <>
      <Nav />
      <main className="shell section stack">
        <div className="actions" style={{ justifyContent: 'space-between' }}><div><p className="eyebrow">Reviewer case</p><h2>{kase.title}</h2></div><StatusBadge status={kase.status} /></div>
        <section className="split">
          <aside className="stack">
            <div className="card"><h3>Evidence</h3>{kase.evidenceItems.map((item) => <p key={item.id}><strong>{item.status}</strong> — {item.label}<br /><span className="muted">{item.description}</span></p>)}</div>
            <div className="card"><h3>Sources</h3>{kase.documents.map((doc) => <details key={doc.id}><summary>{doc.originalFilename}</summary><pre className="markdown">{doc.pages.map((p) => p.text).join('\n\n')}</pre></details>)}</div>
          </aside>
          <article className="stack">
            {latestVersion && <div className="card"><h3>Draft deliverable</h3><pre className="markdown">{latestVersion.contentMarkdown}</pre></div>}
            <div className="card"><h3>AI trace</h3>{kase.aiOutputs.map((out) => <details key={out.id}><summary>{out.outputType}</summary><pre className="markdown">{JSON.stringify(out.outputJson, null, 2)}</pre></details>)}</div>
            <ReviewForm caseId={kase.id} role={user.role} />
          </article>
        </section>
      </main>
    </>
  );
}
