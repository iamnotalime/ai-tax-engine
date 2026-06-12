'use client';

import { ClipboardCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ReviewForm({ caseId, role }: { caseId: string; role: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(formData: FormData) {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/reviewer/cases/${caseId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewType: formData.get('reviewType'), decision: formData.get('decision'), comments: formData.get('comments') })
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error?.message ?? 'Gagal submit review.');
        return;
      }
      setMessage('Review submitted.');
      router.refresh();
    } catch {
      setError('Gagal menghubungi server review.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form-card" action={submit}>
      <div className="form-heading">
        <h3>Submit review</h3>
        <p className="muted">Record the reviewer decision before the case moves forward.</p>
      </div>
      <div className="form-grid">
        <div className="field"><label htmlFor="reviewType">Review type</label><select id="reviewType" name="reviewType"><option value="first_pass">First pass</option>{['licensed_tax_consultant', 'admin'].includes(role) && <option value="senior_qc">Senior QC</option>}<option value="ops_completeness">Ops completeness</option></select></div>
        <div className="field"><label htmlFor="decision">Decision</label><select id="decision" name="decision"><option value="approve">Approve</option><option value="request_changes">Request changes</option><option value="request_more_docs">Request more docs</option><option value="escalate">Escalate</option><option value="reject">Reject</option></select></div>
      </div>
      <div className="field"><label htmlFor="comments">Comments</label><textarea id="comments" name="comments" rows={6} placeholder="Catatan reviewer, dokumen kurang, koreksi argumen, atau risiko." /></div>
      <div aria-live="polite">
        {error && <p className="alert">{error}</p>}
        {message && <p className="muted">{message}</p>}
      </div>
      <button className="button primary" type="submit" disabled={busy}><ClipboardCheck size={18} aria-hidden="true" /> {busy ? 'Submitting...' : 'Submit review'}</button>
    </form>
  );
}
