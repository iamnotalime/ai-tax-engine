'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpDown, ClipboardList, ExternalLink, Search } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

export type CaseWorklistRow = {
  id: string;
  title: string | null;
  status: string;
  caseType: string;
  packageCode?: string | null;
  documentCount: number;
  evidenceCount?: number;
  createdAt: string;
  updatedAt: string;
};

const PRIORITY: Record<string, { score: number; label: string; tone: string }> = {
  escalated: { score: 100, label: 'Urgent', tone: 'danger' },
  senior_qc: { score: 88, label: 'QC now', tone: 'warning' },
  reviewer_reviewing: { score: 82, label: 'In review', tone: 'warning' },
  reviewer_assigned: { score: 76, label: 'Assigned', tone: 'warning' },
  ops_review: { score: 72, label: 'Ops check', tone: 'warning' },
  need_more_docs: { score: 68, label: 'Blocked', tone: 'danger' },
  final_draft_ready: { score: 66, label: 'Ready', tone: 'success' },
  paid: { score: 58, label: 'Paid', tone: 'info' },
  ai_triage_done: { score: 52, label: 'Review next', tone: 'info' },
  ai_triage_running: { score: 44, label: 'AI running', tone: 'info' },
  ai_triage_queued: { score: 40, label: 'Queued', tone: 'info' },
  docs_uploaded: { score: 34, label: 'Needs triage', tone: 'info' },
  intake_started: { score: 22, label: 'Intake', tone: 'neutral' },
  waiting_payment: { score: 20, label: 'Payment', tone: 'warning' },
  delivered: { score: 10, label: 'Delivered', tone: 'success' },
  closed: { score: 0, label: 'Closed', tone: 'neutral' },
  cancelled: { score: 0, label: 'Cancelled', tone: 'neutral' }
};

function priorityFor(row: CaseWorklistRow) {
  const base = PRIORITY[row.status] ?? { score: 25, label: 'Normal', tone: 'neutral' };
  const evidenceBoost = row.evidenceCount === 0 && ['ops_review', 'reviewer_assigned', 'reviewer_reviewing'].includes(row.status) ? 8 : 0;
  return { ...base, score: base.score + evidenceBoost };
}

function label(value: string) {
  return value.replaceAll('_', ' ');
}

function dateValue(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function CaseWorklist({
  rows,
  title = 'Case queue',
  description = 'Cases with operational status and priority.',
  hrefBase = '/cases',
  emptyTitle = 'No cases',
  emptyBody = 'No case rows match the current filters.'
}: {
  rows: CaseWorklistRow[];
  title?: string;
  description?: string;
  hrefBase?: '/cases' | '/reviewer/cases';
  emptyTitle?: string;
  emptyBody?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('priority');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const pageSize = 8;
  const controlId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'case-worklist';

  const statuses = useMemo(() => Array.from(new Set(rows.map((row) => row.status))).sort(), [rows]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        const haystack = [row.id, row.title ?? '', row.status, row.caseType, row.packageCode ?? ''].join(' ').toLowerCase();
        return (!needle || haystack.includes(needle)) && (status === 'all' || row.status === status);
      })
      .sort((a, b) => {
        if (sort === 'priority') return priorityFor(b).score - priorityFor(a).score || dateValue(b.updatedAt) - dateValue(a.updatedAt);
        if (sort === 'oldest') return dateValue(a.updatedAt) - dateValue(b.updatedAt);
        if (sort === 'created') return dateValue(b.createdAt) - dateValue(a.createdAt);
        if (sort === 'title') return (a.title ?? a.id).localeCompare(b.title ?? b.id);
        return dateValue(b.updatedAt) - dateValue(a.updatedAt);
      });
  }, [query, rows, sort, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const visibleIds = visible.map((row) => row.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));

  function toggleSelected(id: string) {
    setMessage(null);
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleVisible() {
    setMessage(null);
    setSelected((current) => {
      if (allVisibleSelected) return current.filter((id) => !visibleIds.includes(id));
      return Array.from(new Set([...current, ...visibleIds]));
    });
  }

  async function copySelected() {
    if (!selected.length) return;
    try {
      await navigator.clipboard.writeText(selected.join('\n'));
      setMessage(`${selected.length} case IDs copied.`);
    } catch {
      setMessage('Could not access clipboard.');
    }
  }

  function openFirstSelected() {
    const first = selected[0] ?? visible[0]?.id;
    if (!first) return;
    router.push(`${hrefBase}/${first}`);
  }

  return (
    <div className="card controlled-card">
      <div className="panel-title">
        <div>
          <h3>{title}</h3>
          <p className="muted">{description}</p>
        </div>
        <span className="kpi">{filtered.length} rows</span>
      </div>

      <div className="table-toolbar" aria-label={`${title} controls`}>
        <label className="control-field" htmlFor={`${controlId}-search`}>
          <span><Search size={15} aria-hidden="true" /> Search</span>
          <input
            id={`${controlId}-search`}
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(1); }}
            placeholder="Case, status, package..."
          />
        </label>
        <label className="control-field" htmlFor={`${controlId}-status`}>
          <span>Status</span>
          <select id={`${controlId}-status`} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            <option value="all">All statuses</option>
            {statuses.map((item) => <option value={item} key={item}>{label(item)}</option>)}
          </select>
        </label>
        <label className="control-field" htmlFor={`${controlId}-sort`}>
          <span><ArrowUpDown size={15} aria-hidden="true" /> Sort</span>
          <select id={`${controlId}-sort`} value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="priority">Priority first</option>
            <option value="updated">Recently updated</option>
            <option value="oldest">Oldest updated</option>
            <option value="created">Recently created</option>
            <option value="title">Title A-Z</option>
          </select>
        </label>
      </div>

      <div className="bulk-bar" aria-live="polite">
        <span>{selected.length ? `${selected.length} selected` : 'Select rows for bulk actions'}</span>
        <div className="actions">
          <button className="button" type="button" onClick={copySelected} disabled={!selected.length}>
            <ClipboardList size={16} aria-hidden="true" /> Copy IDs
          </button>
          <button className="button" type="button" onClick={openFirstSelected} disabled={!selected.length && !visible.length}>
            <ExternalLink size={16} aria-hidden="true" /> Open next
          </button>
          {selected.length > 0 && <button className="button" type="button" onClick={() => setSelected([])}>Clear</button>}
        </div>
        {message && <span className="muted">{message}</span>}
      </div>

      {!filtered.length ? (
        <div className="empty-inline">
          <strong>{emptyTitle}</strong>
          <p className="muted">{emptyBody}</p>
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="table controlled-table">
              <thead>
                <tr>
                  <th>
                    <input
                      aria-label="Select visible cases"
                      checked={allVisibleSelected}
                      type="checkbox"
                      onChange={toggleVisible}
                    />
                  </th>
                  <th>Case</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Docs</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => {
                  const priority = priorityFor(row);
                  return (
                    <tr key={row.id}>
                      <td data-label="Select">
                        <input
                          aria-label={`Select ${row.title ?? row.id}`}
                          checked={selected.includes(row.id)}
                          type="checkbox"
                          onChange={() => toggleSelected(row.id)}
                        />
                      </td>
                      <td data-label="Case">
                        <Link href={`${hrefBase}/${row.id}`}><strong>{row.title ?? row.id}</strong></Link>
                        <br />
                        <span className="muted">{row.id.slice(0, 8)}</span>
                      </td>
                      <td data-label="Priority"><span className={`status ${priority.tone}`}>{priority.label}</span></td>
                      <td data-label="Status"><StatusBadge status={row.status} /></td>
                      <td data-label="Type">{label(row.caseType)}</td>
                      <td data-label="Docs">
                        {row.documentCount}
                        {typeof row.evidenceCount === 'number' && <span className="muted"> / {row.evidenceCount} evidence</span>}
                      </td>
                      <td data-label="Updated">{new Date(row.updatedAt).toLocaleDateString('id-ID')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="pagination-bar">
            <span>Page {safePage} of {totalPages}</span>
            <div className="actions">
              <button className="button" type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={safePage <= 1}>Previous</button>
              <button className="button" type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={safePage >= totalPages}>Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
