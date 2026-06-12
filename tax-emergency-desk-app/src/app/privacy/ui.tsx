'use client';

import { Download, Trash2 } from 'lucide-react';
import { useState } from 'react';

type ActionState = 'idle' | 'running' | 'done' | 'error';

export function PrivacyActions() {
  const [exportState, setExportState] = useState<ActionState>('idle');
  const [deleteState, setDeleteState] = useState<ActionState>('idle');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function exportData() {
    setExportState('running');
    setMessage(null);
    try {
      const response = await fetch('/api/privacy/export', { method: 'POST' });
      if (!response.ok) {
        setExportState('error');
        setMessage('Export failed.');
        return;
      }
      const payload = await response.json();
      const blob = new Blob([JSON.stringify(payload.export, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `taxdesk-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setExportState('done');
      setMessage('Export ready.');
    } catch {
      setExportState('error');
      setMessage('Export failed.');
    }
  }

  async function deleteData() {
    setDeleteState('running');
    setConfirmingDelete(false);
    setMessage(null);
    try {
      const response = await fetch('/api/privacy/delete', { method: 'POST' });
      if (!response.ok) {
        setDeleteState('error');
        setMessage('Deletion request failed.');
        return;
      }
      setDeleteState('done');
      setMessage('Deletion queued.');
    } catch {
      setDeleteState('error');
      setMessage('Deletion request failed.');
    }
  }

  return (
    <div className="stack">
      <div className="actions">
        <button className="button primary" type="button" onClick={exportData} disabled={exportState === 'running'}>
          <Download size={18} aria-hidden="true" />
          {exportState === 'running' ? 'Preparing export...' : 'Export JSON'}
        </button>
        <button className="button danger" type="button" onClick={() => setConfirmingDelete(true)} disabled={deleteState === 'running'}>
          <Trash2 size={18} aria-hidden="true" />
          Delete Data
        </button>
      </div>
      {confirmingDelete && (
        <div className="confirm-panel" role="alertdialog" aria-labelledby="delete-confirm-title" aria-describedby="delete-confirm-copy">
          <div>
            <strong id="delete-confirm-title">Queue deletion request?</strong>
            <p id="delete-confirm-copy" className="muted">Processing will remove account and case data after the privacy workflow completes.</p>
          </div>
          <div className="actions">
            <button className="button danger" type="button" onClick={deleteData} disabled={deleteState === 'running'}>Queue deletion</button>
            <button className="button" type="button" onClick={() => setConfirmingDelete(false)} disabled={deleteState === 'running'}>Cancel</button>
          </div>
        </div>
      )}
      <div aria-live="polite">{message && <span className="muted">{message}</span>}</div>
    </div>
  );
}
