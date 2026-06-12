'use client';

import { PlayCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function CaseActions({ caseId, status }: { caseId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function queueTriage() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/cases/${caseId}/triage`, { method: 'POST' });
      if (!response.ok) throw new Error((await response.json()).error?.message ?? 'Gagal menjalankan triage.');
      setMessage('AI/OCR triage queued.');
      router.refresh();
    } catch (queueError) {
      setError(queueError instanceof Error ? queueError.message : 'Gagal menjalankan triage.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="action-panel">
      <div className="actions">
        <button className="button primary" onClick={queueTriage} disabled={busy || ['ai_triage_queued', 'ai_triage_running'].includes(status)}>
          <PlayCircle size={18} aria-hidden="true" />
          {busy ? 'Queueing...' : 'Run AI triage'}
        </button>
        <span className="muted">Worker menjalankan OCR/classification/RAG/draft/support-check secara async.</span>
      </div>
      <div aria-live="polite">
        {message && <p className="muted">{message}</p>}
        {error && <p className="alert">{error}</p>}
      </div>
    </div>
  );
}
