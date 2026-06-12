'use client';

import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';

export function AdminOpsActions() {
  const [status, setStatus] = useState<'idle' | 'running' | 'queued' | 'error'>('idle');

  async function queueRetention() {
    setStatus('running');
    try {
      const response = await fetch('/api/admin/retention/run', { method: 'POST' });
      setStatus(response.ok ? 'queued' : 'error');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="action-panel">
      <div className="actions">
        <button className="button primary" type="button" onClick={queueRetention} disabled={status === 'running'}>
          <ShieldCheck size={18} aria-hidden="true" />
          {status === 'running' ? 'Queueing retention...' : 'Run Retention'}
        </button>
      </div>
      <div aria-live="polite">
        {status === 'queued' && <span className="muted">Retention job queued.</span>}
        {status === 'error' && <span className="alert">Retention queue failed.</span>}
      </div>
    </div>
  );
}
