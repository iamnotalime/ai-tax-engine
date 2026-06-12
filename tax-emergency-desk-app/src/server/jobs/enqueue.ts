import { env } from '@/config/env';
import { enqueueJob } from './queue';

export async function enqueueTaxTriage(params: {
  caseId: string;
  tenantId: string;
  requestedByUserId: string;
}) {
  const payload = {
    caseId: params.caseId,
    tenantId: params.tenantId,
    requestedByUserId: params.requestedByUserId
  };

  if (env.JOB_BACKEND !== 'temporal') {
    const job = await enqueueJob('tax_triage', payload, 50, params.tenantId);
    return { ...job, backend: 'db' as const };
  }

  const { getTemporalClient } = await import('@/server/temporal/client');
  const client = await getTemporalClient();
  const workflowId = `tax-triage-${params.tenantId}-${params.caseId}-${Date.now()}`;
  const handle = await client.workflow.start('taxTriageWorkflow', {
    taskQueue: env.TEMPORAL_TASK_QUEUE,
    workflowId,
    args: [payload]
  });
  return {
    id: handle.workflowId,
    tenantId: params.tenantId,
    jobType: 'tax_triage',
    status: 'queued',
    payload,
    backend: 'temporal' as const
  };
}
