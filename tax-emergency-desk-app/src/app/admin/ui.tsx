'use client';

import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';

export function AdminOpsActions() {
  const [status, setStatus] = useState<'idle' | 'running' | 'queued' | 'error'>('idle');

  async function queueRetention() {
    setStatus('running');
    const response = await fetch('/api/admin/retention/run', { method: 'POST' });
    setStatus(response.ok ? 'queued' : 'error');
  }

  return (
    <div className="actions">
      <button className="button primary" type="button" onClick={queueRetention} disabled={status === 'running'}>
        <ShieldCheck size={18} aria-hidden="true" />
        Run Retention
      </button>
      {status === 'queued' && <span className="muted">Retention job queued.</span>}
      {status === 'error' && <span className="alert">Retention queue failed.</span>}
    </div>
  );
}
