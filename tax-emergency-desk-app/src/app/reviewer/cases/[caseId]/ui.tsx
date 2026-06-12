'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ReviewForm({ caseId, role }: { caseId: string; role: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  async function submit(formData: FormData) {
    setError(null);
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
    router.refresh();
  }
  return (
    <form className="form-card" action={submit}>
      <h3>Submit review</h3>
      <div className="field"><label>Review type</label><select name="reviewType"><option value="first_pass">First pass</option>{['licensed_tax_consultant', 'admin'].includes(role) && <option value="senior_qc">Senior QC</option>}<option value="ops_completeness">Ops completeness</option></select></div>
      <div className="field"><label>Decision</label><select name="decision"><option value="approve">Approve</option><option value="request_changes">Request changes</option><option value="request_more_docs">Request more docs</option><option value="escalate">Escalate</option><option value="reject">Reject</option></select></div>
      <div className="field"><label>Comments</label><textarea name="comments" rows={6} placeholder="Catatan reviewer, dokumen kurang, koreksi argumen, atau risiko." /></div>
      {error && <p className="alert">{error}</p>}
      <button className="button primary" type="submit">Submit review</button>
    </form>
  );
}
