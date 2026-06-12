'use client';

import { Download, Trash2 } from 'lucide-react';
import { useState } from 'react';

type ActionState = 'idle' | 'running' | 'done' | 'error';

export function PrivacyActions() {
  const [exportState, setExportState] = useState<ActionState>('idle');
  const [deleteState, setDeleteState] = useState<ActionState>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function exportData() {
    setExportState('running');
    setMessage(null);
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
  }

  async function deleteData() {
    if (!window.confirm('Queue deletion for your account and case data? This cannot be undone after processing.')) return;
    setDeleteState('running');
    setMessage(null);
    const response = await fetch('/api/privacy/delete', { method: 'POST' });
    if (!response.ok) {
      setDeleteState('error');
      setMessage('Deletion request failed.');
      return;
    }
    setDeleteState('done');
    setMessage('Deletion queued.');
  }

  return (
    <div className="actions">
      <button className="button primary" type="button" onClick={exportData} disabled={exportState === 'running'}>
        <Download size={18} aria-hidden="true" />
        Export JSON
      </button>
      <button className="button danger" type="button" onClick={deleteData} disabled={deleteState === 'running'}>
        <Trash2 size={18} aria-hidden="true" />
        Delete Data
      </button>
      {message && <span className="muted">{message}</span>}
    </div>
  );
}
