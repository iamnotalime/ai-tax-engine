'use client';

import { useMemo, useState } from 'react';
import { ArrowUpDown, ClipboardList, Search } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

export type JobWorklistRow = {
  id: string;
  jobType: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  priority: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

function label(value: string) {
  return value.replaceAll('_', ' ');
}

function dateValue(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function priorityTone(row: JobWorklistRow) {
  if (row.status === 'failed') return { label: 'Investigate', tone: 'danger', score: 100 + row.attempts };
  if (row.status === 'running') return { label: 'Running', tone: 'info', score: 80 + row.priority };
  if (row.status === 'queued') return { label: row.priority >= 5 ? 'High queue' : 'Queued', tone: 'warning', score: 60 + row.priority };
  if (row.status === 'succeeded') return { label: 'Done', tone: 'success', score: 10 };
  return { label: 'Watch', tone: 'neutral', score: 25 };
}

export function JobWorklist({ rows }: { rows: JobWorklistRow[] }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('priority');
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const pageSize = 8;

  const statuses = useMemo(() => Array.from(new Set(rows.map((row) => row.status))).sort(), [rows]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        const haystack = [row.id, row.jobType, row.status, row.errorMessage ?? ''].join(' ').toLowerCase();
        return (!needle || haystack.includes(needle)) && (status === 'all' || row.status === status);
      })
      .sort((a, b) => {
        if (sort === 'priority') return priorityTone(b).score - priorityTone(a).score || dateValue(b.updatedAt) - dateValue(a.updatedAt);
        if (sort === 'attempts') return b.attempts - a.attempts;
        if (sort === 'oldest') return dateValue(a.updatedAt) - dateValue(b.updatedAt);
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
      setMessage(`${selected.length} job IDs copied.`);
    } catch {
      setMessage('Could not access clipboard.');
    }
  }

  return (
    <div className="card controlled-card">
      <div className="panel-title">
        <div>
          <h3>Recent jobs</h3>
          <p className="muted">Queue health with retry pressure and failure priority.</p>
        </div>
        <span className="kpi">{filtered.length} rows</span>
      </div>

      <div className="table-toolbar" aria-label="Job table controls">
        <label className="control-field" htmlFor="job-search">
          <span><Search size={15} aria-hidden="true" /> Search</span>
          <input id="job-search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Job, error, status..." />
        </label>
        <label className="control-field" htmlFor="job-status">
          <span>Status</span>
          <select id="job-status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            <option value="all">All statuses</option>
            {statuses.map((item) => <option value={item} key={item}>{label(item)}</option>)}
          </select>
        </label>
        <label className="control-field" htmlFor="job-sort">
          <span><ArrowUpDown size={15} aria-hidden="true" /> Sort</span>
          <select id="job-sort" value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="priority">Priority first</option>
            <option value="updated">Recently updated</option>
            <option value="oldest">Oldest updated</option>
            <option value="attempts">Most attempts</option>
          </select>
        </label>
      </div>

      <div className="bulk-bar" aria-live="polite">
        <span>{selected.length ? `${selected.length} selected` : 'Select jobs for bulk actions'}</span>
        <button className="button" type="button" onClick={copySelected} disabled={!selected.length}>
          <ClipboardList size={16} aria-hidden="true" /> Copy IDs
        </button>
        {message && <span className="muted">{message}</span>}
      </div>

      <div className="table-wrap">
        <table className="table controlled-table">
          <thead>
            <tr>
              <th><input aria-label="Select visible jobs" checked={allVisibleSelected} type="checkbox" onChange={toggleVisible} /></th>
              <th>Job</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Attempts</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const priority = priorityTone(row);
              return (
                <tr key={row.id}>
                  <td data-label="Select"><input aria-label={`Select ${row.jobType}`} checked={selected.includes(row.id)} type="checkbox" onChange={() => toggleSelected(row.id)} /></td>
                  <td data-label="Job"><strong>{label(row.jobType)}</strong><br /><span className="muted">{row.id.slice(0, 8)}</span></td>
                  <td data-label="Priority"><span className={`status ${priority.tone}`}>{priority.label}</span></td>
                  <td data-label="Status"><StatusBadge status={row.status} /></td>
                  <td data-label="Attempts">{row.attempts}/{row.maxAttempts}</td>
                  <td data-label="Error">{row.errorMessage ?? '-'}</td>
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
    </div>
  );
}
