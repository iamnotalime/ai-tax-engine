'use client';

import { useMemo, useState } from 'react';
import { ArrowUpDown, Search } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

export type PrivacyRequestRow = {
  id: string;
  requestType: string;
  status: string;
  requestedAt: string;
  fulfilledAt: string | null;
};

function dateValue(value: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function PrivacyRequestTable({ rows }: { rows: PrivacyRequestRow[] }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('requested_desc');
  const statuses = useMemo(() => Array.from(new Set(rows.map((row) => row.status))).sort(), [rows]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        const haystack = [row.id, row.requestType, row.status].join(' ').toLowerCase();
        return (!needle || haystack.includes(needle)) && (status === 'all' || row.status === status);
      })
      .sort((a, b) => sort === 'requested_asc' ? dateValue(a.requestedAt) - dateValue(b.requestedAt) : dateValue(b.requestedAt) - dateValue(a.requestedAt));
  }, [query, rows, sort, status]);

  return (
    <div className="card controlled-card">
      <div className="panel-title">
        <h3>Request ledger</h3>
        <span className="kpi">{filtered.length} rows</span>
      </div>
      <div className="table-toolbar" aria-label="Privacy request controls">
        <label className="control-field" htmlFor="privacy-search">
          <span><Search size={15} aria-hidden="true" /> Search</span>
          <input id="privacy-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Type, status, ID..." />
        </label>
        <label className="control-field" htmlFor="privacy-status">
          <span>Status</span>
          <select id="privacy-status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            {statuses.map((item) => <option value={item} key={item}>{item}</option>)}
          </select>
        </label>
        <label className="control-field" htmlFor="privacy-sort">
          <span><ArrowUpDown size={15} aria-hidden="true" /> Sort</span>
          <select id="privacy-sort" value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="requested_desc">Newest first</option>
            <option value="requested_asc">Oldest first</option>
          </select>
        </label>
      </div>
      <div className="table-wrap">
        <table className="table controlled-table">
          <thead><tr><th>Type</th><th>Status</th><th>Requested</th><th>Fulfilled</th></tr></thead>
          <tbody>
            {filtered.map((request) => (
              <tr key={request.id}>
                <td data-label="Type"><strong>{request.requestType}</strong><br /><span className="muted">{request.id.slice(0, 8)}</span></td>
                <td data-label="Status"><StatusBadge status={request.status} /></td>
                <td data-label="Requested">{new Date(request.requestedAt).toLocaleString('id-ID')}</td>
                <td data-label="Fulfilled">{request.fulfilledAt ? new Date(request.fulfilledAt).toLocaleString('id-ID') : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
