'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function CaseActions({ caseId, status }: { caseId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function queueTriage() {
    setBusy(true);
    await fetch(`/api/cases/${caseId}/triage`, { method: 'POST' });
    setBusy(false);
    router.refresh();
  }
  return (
    <div className="actions">
      <button className="button primary" onClick={queueTriage} disabled={busy || ['ai_triage_queued', 'ai_triage_running'].includes(status)}>{busy ? 'Queueing…' : 'Run AI triage'}</button>
      <span className="muted">Worker menjalankan OCR/classification/RAG/draft/support-check secara async.</span>
    </div>
  );
}
